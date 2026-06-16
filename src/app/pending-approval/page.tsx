"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function PendingApproval() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (user.status === "active") {
        router.push("/dashboard");
      }
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-primary animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-[#cfdaf2] p-8 text-center animate-fade-in-up">
        <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-4xl text-orange-500">pending_actions</span>
        </div>
        
        <h1 className="text-2xl font-bold text-[#111c2d] mb-3">Tài Khoản Đang Chờ Duyệt</h1>
        
        <p className="text-slate-500 mb-8 text-sm leading-relaxed">
          Xin chào <strong>{user.fullName}</strong>,<br />
          Tài khoản của bạn đã được ghi nhận nhưng đang trong trạng thái chờ Quản trị viên hệ thống phê duyệt. Vui lòng quay lại sau hoặc liên hệ Admin để được cấp quyền truy cập.
        </p>

        <button
          onClick={() => logout()}
          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl shadow-sm transition-colors"
        >
          Đăng Xuất
        </button>
      </div>
    </div>
  );
}
