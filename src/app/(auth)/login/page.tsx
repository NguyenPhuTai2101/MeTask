"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Vui lòng điền đầy đủ email và mật khẩu.");
      return;
    }

    setError(null);
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);

    if (!result.success) {
      setError(result.error || "Đăng nhập thất bại.");
    } else {
      router.push("/dashboard");
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setError(null);
    setSubmitting(true);
    const result = await login(demoEmail, "password123");
    setSubmitting(false);

    if (!result.success) {
      setError(result.error || "Đăng nhập tài khoản demo thất bại.");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 relative overflow-hidden font-sans p-4">
      {/* Decorative gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl"></div>

      <div className="w-full max-w-md bg-white border border-[#cfdaf2] rounded-xl shadow-xl overflow-hidden p-6 sm:p-8 relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-500/30 mb-2">
            M
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111c2d]">
            Chào mừng bạn đến với <span className="text-primary font-extrabold">MeTask</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1 text-center">
            Hệ thống Quản lý Dự án & Hiệu suất Đội ngũ
          </p>
        </div>

        {/* Error box */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500" htmlFor="email">
              Địa chỉ Email
            </label>
            <div className="relative flex items-center h-10 w-full rounded-lg bg-slate-50 border border-[#cfdaf2] focus-within:border-primary focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/10 transition-all duration-200">
              <span className="material-symbols-outlined ml-3 text-[18px] text-slate-400 select-none">
                mail
              </span>
              <input
                id="email"
                type="email"
                placeholder="email@vidu.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-full px-3 text-xs text-slate-700 bg-transparent border-0 outline-none"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500" htmlFor="password">
              Mật khẩu
            </label>
            <div className="relative flex items-center h-10 w-full rounded-lg bg-slate-50 border border-[#cfdaf2] focus-within:border-primary focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/10 transition-all duration-200">
              <span className="material-symbols-outlined ml-3 text-[18px] text-slate-400 select-none">
                lock
              </span>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-full px-3 text-xs text-slate-700 bg-transparent border-0 outline-none"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || loading}
            className="w-full h-10 mt-2 bg-primary hover:bg-blue-700 text-white font-semibold text-xs py-2 px-4 rounded-lg shadow-md shadow-blue-500/15 active:scale-98 disabled:opacity-50 transition-all duration-150"
          >
            {submitting ? "Đang đăng nhập..." : "Đăng Nhập"}
          </button>
        </form>

        <div className="mt-5 text-center">
          <p className="text-xs text-slate-400">
            Chưa có tài khoản?{" "}
            <Link href="/register" className="text-primary font-semibold hover:underline">
              Đăng ký ngay
            </Link>
          </p>
        </div>

        {/* Divider */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#cfdaf2]"></div>
          </div>
          <span className="relative px-3 bg-white text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Hoặc đăng nhập nhanh với Demo
          </span>
        </div>

        {/* Quick Demo Logins */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => handleDemoLogin("vana@nexuspm.com")}
            disabled={submitting || loading}
            className="flex items-center gap-3 w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-[#cfdaf2] rounded-lg text-left text-xs font-semibold text-slate-700 active:scale-98 transition-all"
          >
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50"
              alt="Nguyễn Văn A"
              className="w-6 h-6 rounded-full object-cover"
            />
            <div className="flex-1 truncate">
              <p className="text-xs font-bold leading-none">Nguyễn Văn A</p>
              <p className="text-[9px] text-slate-400 mt-0.5">Project Manager</p>
            </div>
            <span className="material-symbols-outlined text-slate-400 text-[16px]">chevron_right</span>
          </button>

          <button
            onClick={() => handleDemoLogin("thib@nexuspm.com")}
            disabled={submitting || loading}
            className="flex items-center gap-3 w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-[#cfdaf2] rounded-lg text-left text-xs font-semibold text-slate-700 active:scale-98 transition-all"
          >
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50"
              alt="Trần Thị B"
              className="w-6 h-6 rounded-full object-cover"
            />
            <div className="flex-1 truncate">
              <p className="text-xs font-bold leading-none">Trần Thị B</p>
              <p className="text-[9px] text-slate-400 mt-0.5">Lead Designer (Đang quá tải)</p>
            </div>
            <span className="material-symbols-outlined text-slate-400 text-[16px]">chevron_right</span>
          </button>

          <button
            onClick={() => handleDemoLogin("hoangc@nexuspm.com")}
            disabled={submitting || loading}
            className="flex items-center gap-3 w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-[#cfdaf2] rounded-lg text-left text-xs font-semibold text-slate-700 active:scale-98 transition-all"
          >
            <img
              src="https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=50"
              alt="Lê Hoàng C"
              className="w-6 h-6 rounded-full object-cover"
            />
            <div className="flex-1 truncate">
              <p className="text-xs font-bold leading-none">Lê Hoàng C</p>
              <p className="text-[9px] text-slate-400 mt-0.5">Frontend Developer</p>
            </div>
            <span className="material-symbols-outlined text-slate-400 text-[16px]">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  );
}
