"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const { user, register, loading } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
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
    if (!fullName || !email || !password) {
      setError("Vui lòng điền đầy đủ các trường thông tin.");
      return;
    }

    setError(null);
    setSubmitting(true);
    // Role is unused in global Auth scope
    const result = await register(email, fullName, password);
    setSubmitting(false);

    if (!result.success) {
      setError(result.error || "Đăng ký tài khoản thất bại.");
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
            Đăng ký tài khoản mới
          </h1>
          <p className="text-slate-400 text-xs mt-1 text-center">
            Tham gia MeTask để quản lý dự án hiệu quả hơn
          </p>
        </div>

        {/* Error box */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500" htmlFor="fullName">
              Họ và Tên
            </label>
            <div className="relative flex items-center h-10 w-full rounded-lg bg-slate-50 border border-[#cfdaf2] focus-within:border-primary focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/10 transition-all duration-200">
              <span className="material-symbols-outlined ml-3 text-[18px] text-slate-400 select-none">
                person
              </span>
              <input
                id="fullName"
                type="text"
                placeholder="Nguyễn Văn A"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full h-full px-3 text-xs text-slate-700 bg-transparent border-0 outline-none"
                required
              />
            </div>
          </div>

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
                placeholder="Tối thiểu 6 ký tự"
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
            {submitting ? "Đang tạo tài khoản..." : "Đăng Ký Tài Khoản"}
          </button>
        </form>

        <div className="mt-5 text-center">
          <p className="text-xs text-slate-400">
            Đã có tài khoản?{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
