"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import UsersManager from "@/components/UsersManager";
import RolesManager from "@/components/RolesManager";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"users" | "roles">("users");

  useEffect(() => {
    if (!loading) {
      if (!user || user.systemRole !== "Admin") {
        router.push("/dashboard");
      }
    }
  }, [user, loading, router]);

  if (loading || !user || user.systemRole !== "Admin") {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-primary animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Header Panel */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111c2d]">
          Quản Trị Hệ Thống (Admin)
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Khu vực dành riêng cho Quản trị viên để kiểm soát danh sách người dùng, xét duyệt truy cập và định nghĩa các chức danh.
        </p>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 ${
            activeTab === "users"
              ? "border-primary text-primary"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          Duyệt & Quản lý Tài Khoản
        </button>
        <button
          onClick={() => setActiveTab("roles")}
          className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 ${
            activeTab === "roles"
              ? "border-primary text-primary"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          Danh sách Vai Trò (Roles)
        </button>
      </div>

      {/* Tab Content */}
      <div className="pt-2 animate-fade-in-up">
        {activeTab === "users" && <UsersManager />}
        {activeTab === "roles" && <RolesManager />}
      </div>
    </div>
  );
}
