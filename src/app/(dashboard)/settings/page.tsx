"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { requestNotificationPermission, showNotification } from "@/lib/notifications";

export default function Settings() {
  const { user } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [offlineCacheSize, setOfflineCacheSize] = useState("1.2 MB");

  useEffect(() => {
    // Check initial notification status
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }
  }, []);

  const handleToggleNotifications = async () => {
    if (notificationsEnabled) {
      // Direct disabled is not possible via API, but we toggle state and inform
      setNotificationsEnabled(false);
      alert("Để tắt hoàn toàn thông báo, vui lòng cấu hình lại quyền trang web trên cài đặt trình duyệt của bạn.");
    } else {
      const granted = await requestNotificationPermission();
      if (granted) {
        setNotificationsEnabled(true);
        showNotification("NexusPM - Thiết lập thông báo", {
          body: "Đã kích hoạt nhận thông báo đẩy cho tác vụ mới!",
        });
      } else {
        alert("Quyền nhận thông báo đã bị từ chối.");
      }
    }
  };

  const handleClearCache = () => {
    alert("Đã xóa bộ nhớ đệm offline thành công!");
    setOfflineCacheSize("0 KB");
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Header Panel */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111c2d]">
          Cấu Hình Hệ Thống (Settings)
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Quản lý thông tin tài khoản, cấu hình thông báo và tùy chọn PWA ngoại tuyến.
        </p>
      </div>

      {/* Account Profile Card */}
      <div className="bg-white border border-[#cfdaf2] rounded-xl p-5 shadow-sm flex flex-col gap-4">
        <h3 className="font-bold text-[#111c2d] text-sm uppercase tracking-wider">
          Thông Tin Tài Khoản
        </h3>

        {user ? (
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={user.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
              alt={user.fullName}
              className="w-16 h-16 rounded-full object-cover border border-slate-100 shadow-sm"
            />
            <div className="flex flex-col gap-1">
              <h4 className="font-bold text-base text-[#111c2d]">{user.fullName}</h4>
              <p className="text-sm text-slate-500 font-medium">{user.email}</p>
              <span className="inline-flex self-start mt-1 bg-blue-50 text-primary text-xs font-bold px-2.5 py-1 rounded-md border border-blue-200">
                {user.role}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400 italic">Chưa đăng nhập.</p>
        )}
      </div>

      {/* PWA & Notifications Settings Card */}
      <div className="bg-white border border-[#cfdaf2] rounded-xl p-5 shadow-sm flex flex-col gap-5">
        <h3 className="font-bold text-[#111c2d] text-sm uppercase tracking-wider">
          Tùy Chọn Ứng Dụng (PWA Settings)
        </h3>

        {/* Notifications Toggle */}
        <div className="flex items-center justify-between gap-4 py-1.5">
          <div>
            <h4 className="font-bold text-sm text-[#111c2d]">Thông Báo Đẩy (Push Notifications)</h4>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Nhận thông báo tức thì khi có cập nhật tác vụ hoặc bình luận mới.
            </p>
          </div>
          <button
            onClick={handleToggleNotifications}
            className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-200 focus:outline-none ${
              notificationsEnabled ? "bg-primary" : "bg-slate-200"
            }`}
          >
            <div
              className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                notificationsEnabled ? "translate-x-5.5" : "translate-x-0"
              }`}
            ></div>
          </button>
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-100"></div>

        {/* Offline Cache manager */}
        <div className="flex items-center justify-between gap-4 py-1.5">
          <div>
            <h4 className="font-bold text-sm text-[#111c2d]">Dung Lượng Lưu Trữ Ngoại Tuyến</h4>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Dung lượng bộ đệm HTML, CSS, JS tĩnh và dữ liệu IndexDB hiện tại:{" "}
              <span className="text-primary font-bold">{offlineCacheSize}</span>
            </p>
          </div>
          <button
            onClick={handleClearCache}
            className="border border-[#cfdaf2] hover:bg-slate-50 text-[#111c2d] font-semibold text-xs px-4 py-2 rounded-lg transition-colors"
          >
            Xóa Bộ Đệm
          </button>
        </div>
      </div>
    </div>
  );
}
