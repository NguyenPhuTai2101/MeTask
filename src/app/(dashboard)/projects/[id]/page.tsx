"use client";

import React, { useState, useEffect, use } from "react";
import { useAuth } from "@/context/AuthContext";
import SearchableSelect, { SearchOption } from "@/components/SearchableSelect";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  const [project, setProject] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState<"modules" | "members">("modules");

  // Auth role
  const [isProjectManager, setIsProjectManager] = useState(false);

  // Member Form
  const [selectedUser, setSelectedUser] = useState("");
  const [memberRole, setMemberRole] = useState("");
  const [memberWorkload, setMemberWorkload] = useState("40");
  const [managingMember, setManagingMember] = useState(false);

  // Module Form
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [newModuleName, setNewModuleName] = useState("");
  const [newModuleDesc, setNewModuleDesc] = useState("");
  const [newModuleStartDate, setNewModuleStartDate] = useState("");
  const [newModuleEndDate, setNewModuleEndDate] = useState("");
  const [creatingModule, setCreatingModule] = useState(false);

  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState("");
  const [newFeatureParentId, setNewFeatureParentId] = useState<string | null>(null);
  const [newFeatureName, setNewFeatureName] = useState("");
  const [newFeatureDesc, setNewFeatureDesc] = useState("");
  const [newFeatureStartDate, setNewFeatureStartDate] = useState("");
  const [newFeatureEndDate, setNewFeatureEndDate] = useState("");
  const [creatingFeature, setCreatingFeature] = useState(false);

  // Edit States
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectDesc, setEditProjectDesc] = useState("");
  const [updatingProject, setUpdatingProject] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);

  const [showEditModuleModal, setShowEditModuleModal] = useState(false);
  const [editModuleId, setEditModuleId] = useState("");
  const [editModuleName, setEditModuleName] = useState("");
  const [editModuleDesc, setEditModuleDesc] = useState("");
  const [editModuleStartDate, setEditModuleStartDate] = useState("");
  const [editModuleEndDate, setEditModuleEndDate] = useState("");
  const [updatingModule, setUpdatingModule] = useState(false);

  const [showEditFeatureModal, setShowEditFeatureModal] = useState(false);
  const [editFeatureId, setEditFeatureId] = useState("");
  const [editFeatureName, setEditFeatureName] = useState("");
  const [editFeatureDesc, setEditFeatureDesc] = useState("");
  const [editFeatureStartDate, setEditFeatureStartDate] = useState("");
  const [editFeatureEndDate, setEditFeatureEndDate] = useState("");
  const [editFeatureParentId, setEditFeatureParentId] = useState<string | null>(null);
  const [updatingFeature, setUpdatingFeature] = useState(false);

  // Expanded elements
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [expandedFeatures, setExpandedFeatures] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchProjectDetails();
    fetchUsers();
    fetchRoles();
  }, [id]);

  useEffect(() => {
    if (user && project) {
      const myMember = project.members?.find((m: any) => m.userId === user.id);
      setIsProjectManager(myMember?.role === "Project Manager" || myMember?.role === "Admin"); // Handle dynamic roles somewhat
    }
  }, [user, project]);

  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/roles");
      if (res.ok) {
        const data = await res.json();
        setRoles(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProjectDetails = async (showLoading = true) => {
    try {
      if (showLoading && !project) setLoading(true); // Only show spinner if we don't have project data yet
      const res = await fetch(`/api/projects/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data);
      } else {
        if (res.status === 403) {
          setError("Bạn không có quyền truy cập dự án này.");
        } else {
          setError("Không thể tải thông tin dự án.");
        }
      }
    } catch (err) {
      console.error(err);
      setError("Có lỗi xảy ra khi tải dự án.");
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

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  // --- MEMBER HANDLERS ---
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !memberRole) {
      alert("Vui lòng chọn nhân sự và vai trò.");
      return;
    }
    setManagingMember(true);
    try {
      const res = await fetch(`/api/projects/${id}/members`, {
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
        fetchProjectDetails(false);
      } else {
        const err = await res.json();
        alert(err.error || "Có lỗi xảy ra");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setManagingMember(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa thành viên này khỏi dự án?")) {
      try {
        const res = await fetch(`/api/projects/${id}/members?userId=${userId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          fetchProjectDetails(false);
        } else {
          const err = await res.json();
          alert(err.error || "Có lỗi xảy ra");
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // --- MODULE HANDLERS ---
  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleName) return;
    setCreatingModule(true);
    try {
      const res = await fetch(`/api/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: id,
          name: newModuleName,
          description: newModuleDesc,
          startDate: newModuleStartDate || null,
          endDate: newModuleEndDate || null
        }),
      });
      if (res.ok) {
        setNewModuleName("");
        setNewModuleDesc("");
        setNewModuleStartDate("");
        setNewModuleEndDate("");
        setShowModuleModal(false);
        fetchProjectDetails(false);
      } else {
        const err = await res.json();
        alert(err.error || "Lỗi tạo Phân hệ");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingModule(false);
    }
  };

  // --- FEATURE HANDLERS ---
  const openFeatureModal = (moduleId: string, parentFeatureId?: string) => {
    setActiveModuleId(moduleId);
    setNewFeatureParentId(parentFeatureId || null);
    setShowFeatureModal(true);
  };

  const handleCreateFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeatureName || !activeModuleId) return;
    setCreatingFeature(true);
    try {
      const res = await fetch(`/api/features`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId: activeModuleId,
          name: newFeatureName,
          description: newFeatureDesc,
          startDate: newFeatureStartDate || null,
          endDate: newFeatureEndDate || null,
          parentFeatureId: newFeatureParentId || null
        }),
      });
      if (res.ok) {
        setNewFeatureName("");
        setNewFeatureDesc("");
        setNewFeatureStartDate("");
        setNewFeatureEndDate("");
        setNewFeatureParentId(null);
        setShowFeatureModal(false);
        
        // auto expand the module to see the new feature
        setExpandedModules(prev => ({ ...prev, [activeModuleId]: true }));
        if (newFeatureParentId) {
          setExpandedFeatures(prev => ({ ...prev, [newFeatureParentId]: true }));
        }
        fetchProjectDetails(false);
      } else {
        const err = await res.json();
        alert(err.error || "Lỗi tạo Chức năng");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingFeature(false);
    }
  };

  // --- DELETE HANDLERS ---
  const handleDeleteProject = async () => {
    if (!confirm("BẠN CÓ CHẮC CHẮN MUỐN XÓA DỰ ÁN NÀY KHÔNG?\nTất cả Phân hệ, Chức năng và Tác vụ bên trong cũng sẽ bị xóa vĩnh viễn!")) return;
    setDeletingProject(true);
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/projects");
      } else {
        const err = await res.json();
        alert(err.error || "Lỗi xóa dự án");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingProject(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm("Xóa Phân hệ này sẽ xóa tất cả Chức năng và Tác vụ bên trong. Tiếp tục?")) return;
    try {
      const res = await fetch(`/api/modules/${moduleId}`, { method: "DELETE" });
      if (res.ok) {
        fetchProjectDetails(false);
      } else {
        const err = await res.json();
        alert(err.error || "Lỗi xóa phân hệ");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFeature = async (featureId: string) => {
    if (!confirm("Xóa Chức năng này sẽ xóa tất cả Tác vụ bên trong. Tiếp tục?")) return;
    try {
      const res = await fetch(`/api/features/${featureId}`, { method: "DELETE" });
      if (res.ok) {
        fetchProjectDetails(false);
      } else {
        const err = await res.json();
        alert(err.error || "Lỗi xóa chức năng");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- EDIT HANDLERS ---
  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProjectName) return;
    setUpdatingProject(true);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editProjectName, description: editProjectDesc }),
      });
      if (res.ok) {
        setShowEditProjectModal(false);
        fetchProjectDetails(false);
      } else {
        const err = await res.json();
        alert(err.error || "Lỗi cập nhật dự án");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingProject(false);
    }
  };

  const handleUpdateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModuleName || !editModuleId) return;
    setUpdatingModule(true);
    try {
      const res = await fetch(`/api/modules/${editModuleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: editModuleName, 
          description: editModuleDesc,
          startDate: editModuleStartDate || null,
          endDate: editModuleEndDate || null
        }),
      });
      if (res.ok) {
        setShowEditModuleModal(false);
        fetchProjectDetails(false);
      } else {
        const err = await res.json();
        alert(err.error || "Lỗi cập nhật Phân hệ");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingModule(false);
    }
  };

  const handleUpdateFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFeatureName || !editFeatureId) return;
    setUpdatingFeature(true);
    try {
      const res = await fetch(`/api/features/${editFeatureId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editFeatureName,
          description: editFeatureDesc,
          startDate: editFeatureStartDate || null,
          endDate: editFeatureEndDate || null,
          parentFeatureId: editFeatureParentId || null
        }),
      });
      if (res.ok) {
        setShowEditFeatureModal(false);
        fetchProjectDetails(false);
      } else {
        const err = await res.json();
        alert(err.error || "Lỗi cập nhật Chức năng");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingFeature(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-primary animate-spin"></div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="bg-white border border-dashed border-red-200 rounded-xl p-12 text-center max-w-lg mx-auto mt-10">
        <span className="material-symbols-outlined text-red-400 text-[48px] mb-2">error</span>
        <p className="text-red-500 font-semibold text-sm">{error || "Dự án không tồn tại."}</p>
        <button onClick={() => router.push("/projects")} className="text-primary text-xs mt-4 hover:underline">
          Quay lại danh sách dự án
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex gap-4 items-start">
          <button 
            onClick={() => router.push("/projects")}
            className="mt-1 flex items-center justify-center w-8 h-8 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-500 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#111c2d]">{project.name}</h1>
            <p className="text-slate-500 text-sm mt-1 max-w-2xl">{project.description || "Không có mô tả chi tiết."}</p>
            <div className="flex gap-4 mt-3">
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-md">
                <span className="material-symbols-outlined text-[14px]">group</span>
                {project.members?.length} Thành viên
              </span>
              {isProjectManager && (
                <span className="inline-flex items-center gap-1.5 text-xs text-primary bg-blue-50 border border-blue-100 px-2 py-1 rounded-md font-medium">
                  <span className="material-symbols-outlined text-[14px]">verified_user</span>
                  Bạn là Project Manager
                </span>
              )}
              {isProjectManager && (
                <button
                  onClick={() => {
                    setEditProjectName(project.name);
                    setEditProjectDesc(project.description || "");
                    setShowEditProjectModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-primary bg-white border border-slate-200 hover:border-primary px-2 py-1 rounded-md transition-all"
                >
                  <span className="material-symbols-outlined text-[14px]">edit</span>
                  Chỉnh sửa
                </button>
              )}
              {isProjectManager && (
                <button
                  onClick={handleDeleteProject}
                  disabled={deletingProject}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-500 bg-white border border-slate-200 hover:border-red-500 px-2 py-1 rounded-md transition-all"
                >
                  <span className="material-symbols-outlined text-[14px]">delete</span>
                  {deletingProject ? "Đang xóa..." : "Xóa"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-slate-200 px-1">
        <button
          onClick={() => setActiveTab("modules")}
          className={`pb-3 text-sm font-semibold transition-colors relative ${
            activeTab === "modules" ? "text-primary" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Cấu trúc Phân hệ (Modules)
          {activeTab === "modules" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("members")}
          className={`pb-3 text-sm font-semibold transition-colors relative ${
            activeTab === "members" ? "text-primary" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Thành viên dự án
          {activeTab === "members" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></span>
          )}
        </button>
      </div>

      {/* Tab Content: MODULES */}
      {activeTab === "modules" && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-bold text-slate-700">Danh sách Phân hệ & Chức năng</h2>
            {isProjectManager && (
              <button
                onClick={() => setShowModuleModal(true)}
                className="flex items-center gap-1.5 bg-primary hover:bg-blue-700 text-white font-semibold text-xs py-2 px-3 rounded-lg transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Tạo Phân hệ
              </button>
            )}
          </div>

          {project.modules?.length === 0 ? (
             <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center">
               <span className="material-symbols-outlined text-slate-300 text-[40px] mb-2">account_tree</span>
               <p className="text-slate-500 font-medium text-sm">Chưa có Phân hệ nào</p>
               {isProjectManager && <p className="text-slate-400 text-xs mt-1">Hãy tạo phân hệ đầu tiên cho dự án này.</p>}
             </div>
          ) : (
            <div className="flex flex-col gap-3">
              {project.modules?.map((mod: any) => (
                <div key={mod.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  {/* Module Header */}
                    <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => toggleModule(mod.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`material-symbols-outlined text-slate-400 transition-transform ${expandedModules[mod.id] ? "rotate-90" : ""}`}>
                        chevron_right
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[18px]">view_module</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-[#111c2d]">{mod.name}</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">{mod.description || "Không có mô tả"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="hidden md:flex gap-4 text-xs font-medium text-slate-500">
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-slate-400 uppercase">Bắt đầu</span>
                          <span>{mod.startDate ? new Date(mod.startDate).toLocaleDateString("vi-VN") : "-"}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-slate-400 uppercase">Kết thúc</span>
                          <span>{mod.endDate ? new Date(mod.endDate).toLocaleDateString("vi-VN") : "-"}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {isProjectManager && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditModuleId(mod.id);
                              setEditModuleName(mod.name);
                              setEditModuleDesc(mod.description || "");
                              setEditModuleStartDate(mod.startDate || "");
                              setEditModuleEndDate(mod.endDate || "");
                              setShowEditModuleModal(true);
                            }}
                            className="text-slate-400 hover:text-primary p-1 rounded-md hover:bg-slate-100 transition-colors"
                            title="Sửa Phân hệ"
                          >
                            <span className="material-symbols-outlined text-[16px] block">edit</span>
                          </button>
                        )}
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                          {mod.features?.length || 0} Chức năng
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Features List (Expanded) */}
                  {expandedModules[mod.id] && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Cấu trúc Chức năng (Features)
                        </h4>
                        {isProjectManager && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openFeatureModal(mod.id); }}
                            className="flex items-center gap-1 bg-white border border-slate-200 hover:border-primary text-primary px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm"
                          >
                            <span className="material-symbols-outlined text-[14px]">add</span>
                            Thêm Chức năng gốc
                          </button>
                        )}
                      </div>

                      {mod.features?.length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-4 bg-white border border-dashed border-slate-200 rounded-lg">Chưa có chức năng nào trong phân hệ này.</p>
                      ) : (
                        <div className="flex flex-col border border-slate-200 rounded-lg overflow-hidden bg-white">
                          <div className="grid grid-cols-12 gap-2 bg-slate-100 border-b border-slate-200 p-3 text-xs font-bold text-slate-600">
                            <div className="col-span-6">Tên Chức năng</div>
                            <div className="col-span-2 text-center">Bắt đầu</div>
                            <div className="col-span-2 text-center">Kết thúc</div>
                            <div className="col-span-2 text-right">Hành động</div>
                          </div>
                          
                          {/* Recursive Feature Renderer */}
                          {(() => {
                            // Find root features (no parentFeatureId or parent doesn't exist in this module)
                            const rootFeatures = mod.features.filter((f: any) => !f.parentFeatureId || !mod.features.some((pf: any) => pf.id === f.parentFeatureId));
                            
                            const renderFeatureRow = (feature: any, level: number) => {
                              const childFeatures = mod.features.filter((f: any) => f.parentFeatureId === feature.id);
                              const hasChildren = childFeatures.length > 0;
                              const isExpanded = expandedFeatures[feature.id];
                              
                              return (
                                <React.Fragment key={feature.id}>
                                  <div className="grid grid-cols-12 gap-2 p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors items-center text-xs">
                                    <div className="col-span-6 flex items-center" style={{ paddingLeft: `${level * 24}px` }}>
                                      {hasChildren ? (
                                        <button 
                                          onClick={() => setExpandedFeatures(prev => ({...prev, [feature.id]: !prev[feature.id]}))}
                                          className="w-5 h-5 flex items-center justify-center mr-1 text-slate-400 hover:bg-slate-200 rounded shrink-0 transition-all"
                                        >
                                          <span className={`material-symbols-outlined text-[16px] transition-transform ${isExpanded ? "rotate-90" : ""}`}>
                                            chevron_right
                                          </span>
                                        </button>
                                      ) : (
                                        <div className="w-5 h-5 flex items-center justify-center mr-1 text-slate-300 shrink-0">
                                          <span className="material-symbols-outlined text-[14px]">horizontal_rule</span>
                                        </div>
                                      )}
                                      <div className="truncate font-semibold text-slate-700" title={feature.name}>
                                        {feature.name}
                                        {feature.description && <span className="text-[10px] font-normal text-slate-400 block truncate" title={feature.description}>{feature.description}</span>}
                                      </div>
                                    </div>
                                    <div className="col-span-2 text-center font-medium text-slate-600">
                                      {feature.startDate ? new Date(feature.startDate).toLocaleDateString("vi-VN") : "-"}
                                    </div>
                                    <div className="col-span-2 text-center font-medium text-slate-600">
                                      {feature.endDate ? new Date(feature.endDate).toLocaleDateString("vi-VN") : "-"}
                                    </div>
                                    <div className="col-span-2 flex justify-end items-center gap-1">
                                      {isProjectManager && (
                                        <>
                                          <button
                                            onClick={() => openFeatureModal(mod.id, feature.id)}
                                            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                            title="Thêm chức năng con"
                                          >
                                            <span className="material-symbols-outlined text-[16px]">add_circle</span>
                                          </button>
                                          <button
                                            onClick={() => {
                                              setEditFeatureId(feature.id);
                                              setEditFeatureName(feature.name);
                                              setEditFeatureDesc(feature.description || "");
                                              setEditFeatureStartDate(feature.startDate || "");
                                              setEditFeatureEndDate(feature.endDate || "");
                                              setEditFeatureParentId(feature.parentFeatureId || null);
                                              setShowEditFeatureModal(true);
                                            }}
                                            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-blue-50 rounded transition-colors"
                                            title="Sửa"
                                          >
                                            <span className="material-symbols-outlined text-[16px]">edit</span>
                                          </button>
                                          <button
                                            onClick={() => handleDeleteFeature(feature.id)}
                                            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                            title="Xóa"
                                          >
                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  {hasChildren && isExpanded && (
                                    <div className="flex flex-col">
                                      {childFeatures.map((child: any) => renderFeatureRow(child, level + 1))}
                                    </div>
                                  )}
                                </React.Fragment>
                              );
                            };

                            return rootFeatures.map((feat: any) => renderFeatureRow(feat, 0));
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: MEMBERS */}
      {activeTab === "members" && (
        <div className="flex flex-col gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-700 mb-4">Thành viên hiện tại</h2>
            <div className="flex flex-col gap-2">
              {project.members?.map((member: any) => (
                <div
                  key={member.userId}
                  className="flex items-center justify-between p-3 border border-slate-100 bg-slate-50/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={member.user?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
                      alt={member.user?.fullName}
                      className="w-8 h-8 rounded-full object-cover border border-white shadow-sm"
                    />
                    <div>
                      <p className="text-xs font-semibold text-[#111c2d]">
                        {member.user?.fullName} {member.userId === user?.id && <span className="text-slate-400 font-normal">(Bạn)</span>}
                      </p>
                      <p className="text-[10px] text-slate-400">{member.user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[10px] bg-blue-50 text-primary px-2 py-0.5 rounded font-bold">
                        {member.role}
                      </span>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Tải trọng: <span className="font-bold">{member.workloadPercentage}%</span>
                      </p>
                    </div>
                    {isProjectManager && (
                      <button
                        onClick={() => handleRemoveMember(member.userId)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa khỏi dự án"
                      >
                        <span className="material-symbols-outlined block text-[18px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add new member form */}
          {isProjectManager && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-700 mb-3">Thêm thành viên mới</h2>
              <form onSubmit={handleAddMember} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-[10px] font-semibold text-slate-500">Chọn Nhân Sự</label>
                  <SearchableSelect
                    value={selectedUser}
                    onChange={setSelectedUser}
                    placeholder="Tìm theo tên hoặc email..."
                    options={users
                      .filter((u) => !project.members?.some((m: any) => m.userId === u.id))
                      .map((u) => ({
                        value: u.id,
                        label: u.fullName,
                        subLabel: u.email,
                        avatarUrl: u.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100",
                      }))}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-slate-500">Vai Trò</label>
                  <SearchableSelect
                    value={memberRole}
                    onChange={setMemberRole}
                    placeholder="Tìm chức danh..."
                    options={roles.map(r => ({
                      value: r.name,
                      label: r.name,
                      subLabel: r.description
                    }))}
                  />
                </div>

                <div className="flex gap-2">
                  <div className="flex-1 flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-slate-500">Khối lượng công việc dự kiến (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="200"
                      value={memberWorkload}
                      onChange={(e) => setMemberWorkload(e.target.value)}
                      className="h-9 w-full rounded-lg bg-slate-50 border border-slate-200 px-2 text-xs outline-none focus:border-primary"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={managingMember}
                    className="h-9 bg-primary hover:bg-blue-700 text-white font-semibold text-xs px-2 rounded-lg shadow-sm flex items-center justify-center transition-all mt-5"
                  >
                    {managingMember ? "Đang thêm..." : "Thêm"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Create Module */}
      {showModuleModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#cfdaf2] rounded-xl shadow-2xl max-w-md w-full p-6 animate-scale-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-base text-[#111c2d] flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">view_module</span>
                Tạo Phân hệ Mới
              </h3>
              <button onClick={() => setShowModuleModal(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
                <span className="material-symbols-outlined block text-[22px]">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateModule} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Tên Phân hệ</label>
                <input
                  type="text"
                  placeholder="VD: Quản lý Nhân sự"
                  value={newModuleName}
                  onChange={(e) => setNewModuleName(e.target.value)}
                  className="h-10 w-full rounded-lg bg-slate-50 border border-[#cfdaf2] px-3 text-xs outline-none focus:border-primary focus:bg-white"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Mô tả chi tiết</label>
                <textarea
                  placeholder="Mô tả phân hệ..."
                  value={newModuleDesc}
                  onChange={(e) => setNewModuleDesc(e.target.value)}
                  className="h-20 w-full rounded-lg bg-slate-50 border border-[#cfdaf2] p-3 text-xs outline-none focus:border-primary focus:bg-white resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500">Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={newModuleStartDate}
                    onChange={(e) => setNewModuleStartDate(e.target.value)}
                    className="h-10 w-full rounded-lg bg-slate-50 border border-[#cfdaf2] px-3 text-xs outline-none focus:border-primary focus:bg-white"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500">Ngày kết thúc</label>
                  <input
                    type="date"
                    value={newModuleEndDate}
                    onChange={(e) => setNewModuleEndDate(e.target.value)}
                    className="h-10 w-full rounded-lg bg-slate-50 border border-[#cfdaf2] px-3 text-xs outline-none focus:border-primary focus:bg-white"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={creatingModule}
                className="w-full h-10 bg-primary hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-md active:scale-98 transition-all"
              >
                {creatingModule ? "Đang tạo..." : "Tạo Phân hệ"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Create Feature */}
      {showFeatureModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#cfdaf2] rounded-xl shadow-2xl max-w-md w-full p-6 animate-scale-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-base text-[#111c2d] flex items-center gap-2">
                <span className="material-symbols-outlined text-green-500">category</span>
                Tạo Chức năng Mới
              </h3>
              <button onClick={() => setShowFeatureModal(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
                <span className="material-symbols-outlined block text-[22px]">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateFeature} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Tên Chức năng</label>
                <input
                  type="text"
                  placeholder="VD: Đăng nhập bằng Google"
                  value={newFeatureName}
                  onChange={(e) => setNewFeatureName(e.target.value)}
                  className="h-10 w-full rounded-lg bg-slate-50 border border-[#cfdaf2] px-3 text-xs outline-none focus:border-primary focus:bg-white"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Mô tả</label>
                <textarea
                  placeholder="Mô tả chức năng..."
                  value={newFeatureDesc}
                  onChange={(e) => setNewFeatureDesc(e.target.value)}
                  className="h-20 w-full rounded-lg bg-slate-50 border border-[#cfdaf2] p-3 text-xs outline-none focus:border-primary focus:bg-white resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500">Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={newFeatureStartDate}
                    onChange={(e) => setNewFeatureStartDate(e.target.value)}
                    className="h-10 w-full rounded-lg bg-slate-50 border border-[#cfdaf2] px-3 text-xs outline-none focus:border-primary focus:bg-white"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500">Ngày kết thúc</label>
                  <input
                    type="date"
                    value={newFeatureEndDate}
                    onChange={(e) => setNewFeatureEndDate(e.target.value)}
                    className="h-10 w-full rounded-lg bg-slate-50 border border-[#cfdaf2] px-3 text-xs outline-none focus:border-primary focus:bg-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={creatingFeature}
                className="w-full h-10 bg-green-500 hover:bg-green-600 text-white font-semibold text-xs rounded-lg shadow-md active:scale-98 transition-all"
              >
                {creatingFeature ? "Đang tạo..." : "Tạo Chức năng"}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: Edit Project */}
      {showEditProjectModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#cfdaf2] rounded-xl shadow-2xl max-w-md w-full p-6 animate-scale-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-base text-[#111c2d] flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">edit_document</span>
                Chỉnh sửa Dự án
              </h3>
              <button onClick={() => setShowEditProjectModal(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
                <span className="material-symbols-outlined block text-[22px]">close</span>
              </button>
            </div>
            <form onSubmit={handleUpdateProject} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Tên Dự án</label>
                <input
                  type="text"
                  value={editProjectName}
                  onChange={(e) => setEditProjectName(e.target.value)}
                  className="h-10 w-full rounded-lg bg-slate-50 border border-[#cfdaf2] px-3 text-xs outline-none focus:border-primary focus:bg-white"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Mô tả</label>
                <textarea
                  value={editProjectDesc}
                  onChange={(e) => setEditProjectDesc(e.target.value)}
                  className="h-20 w-full rounded-lg bg-slate-50 border border-[#cfdaf2] p-3 text-xs outline-none focus:border-primary focus:bg-white resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={updatingProject}
                className="w-full h-10 bg-primary hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-md active:scale-98 transition-all"
              >
                {updatingProject ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Module */}
      {showEditModuleModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#cfdaf2] rounded-xl shadow-2xl max-w-md w-full p-6 animate-scale-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-base text-[#111c2d] flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">edit_square</span>
                Chỉnh sửa Phân hệ
              </h3>
              <button onClick={() => setShowEditModuleModal(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
                <span className="material-symbols-outlined block text-[22px]">close</span>
              </button>
            </div>
            <form onSubmit={handleUpdateModule} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Tên Phân hệ</label>
                <input
                  type="text"
                  value={editModuleName}
                  onChange={(e) => setEditModuleName(e.target.value)}
                  className="h-10 w-full rounded-lg bg-slate-50 border border-[#cfdaf2] px-3 text-xs outline-none focus:border-primary focus:bg-white"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Mô tả</label>
                <textarea
                  value={editModuleDesc}
                  onChange={(e) => setEditModuleDesc(e.target.value)}
                  className="h-20 w-full rounded-lg bg-slate-50 border border-[#cfdaf2] p-3 text-xs outline-none focus:border-primary focus:bg-white resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500">Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={editModuleStartDate}
                    onChange={(e) => setEditModuleStartDate(e.target.value)}
                    className="h-10 w-full rounded-lg bg-slate-50 border border-[#cfdaf2] px-3 text-xs outline-none focus:border-primary focus:bg-white"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500">Ngày kết thúc</label>
                  <input
                    type="date"
                    value={editModuleEndDate}
                    onChange={(e) => setEditModuleEndDate(e.target.value)}
                    className="h-10 w-full rounded-lg bg-slate-50 border border-[#cfdaf2] px-3 text-xs outline-none focus:border-primary focus:bg-white"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={updatingModule}
                className="w-full h-10 bg-primary hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-md active:scale-98 transition-all"
              >
                {updatingModule ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Feature */}
      {showEditFeatureModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#cfdaf2] rounded-xl shadow-2xl max-w-md w-full p-6 animate-scale-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-base text-[#111c2d] flex items-center gap-2">
                <span className="material-symbols-outlined text-green-500">edit_square</span>
                Chỉnh sửa Chức năng
              </h3>
              <button onClick={() => setShowEditFeatureModal(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
                <span className="material-symbols-outlined block text-[22px]">close</span>
              </button>
            </div>
            <form onSubmit={handleUpdateFeature} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Tên Chức năng</label>
                <input
                  type="text"
                  value={editFeatureName}
                  onChange={(e) => setEditFeatureName(e.target.value)}
                  className="h-10 w-full rounded-lg bg-slate-50 border border-[#cfdaf2] px-3 text-xs outline-none focus:border-primary focus:bg-white"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Mô tả</label>
                <textarea
                  value={editFeatureDesc}
                  onChange={(e) => setEditFeatureDesc(e.target.value)}
                  className="h-20 w-full rounded-lg bg-slate-50 border border-[#cfdaf2] p-3 text-xs outline-none focus:border-primary focus:bg-white resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500">Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={editFeatureStartDate}
                    onChange={(e) => setEditFeatureStartDate(e.target.value)}
                    className="h-10 w-full rounded-lg bg-slate-50 border border-[#cfdaf2] px-3 text-xs outline-none focus:border-primary focus:bg-white"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500">Ngày kết thúc</label>
                  <input
                    type="date"
                    value={editFeatureEndDate}
                    onChange={(e) => setEditFeatureEndDate(e.target.value)}
                    className="h-10 w-full rounded-lg bg-slate-50 border border-[#cfdaf2] px-3 text-xs outline-none focus:border-primary focus:bg-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={updatingFeature}
                className="w-full h-10 bg-green-500 hover:bg-green-600 text-white font-semibold text-xs rounded-lg shadow-md active:scale-98 transition-all"
              >
                {updatingFeature ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
