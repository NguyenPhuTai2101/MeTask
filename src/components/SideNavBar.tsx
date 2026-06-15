"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { usePWAInstall } from "@/hooks/usePWAInstall";

interface SideNavBarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "space_dashboard" },
  { label: "Bảng Công Việc", href: "/board", icon: "view_kanban" },
  { label: "Dự Án & Đội Ngũ", href: "/projects", icon: "folder_open" },
  { label: "Lịch Biểu & Gantt", href: "/calendar", icon: "calendar_month" },
  { label: "Tải Trọng Đội Ngũ", href: "/workload", icon: "group" },
  { label: "Cài Đặt PWA", href: "/settings", icon: "settings" },
];

export default function SideNavBar({ isOpen, onClose }: SideNavBarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isInstallable, triggerInstall } = usePWAInstall();
  
  // Local state for standalone mode and instructions popup
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsStandalone(
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true
      );
    }
  }, []);

  const handleInstallClick = async () => {
    const success = await triggerInstall();
    if (!success) {
      setShowInstructions(true);
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden transition-all duration-300"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`w-64 h-screen border-r border-[#cfdaf2] bg-slate-50 py-6 px-4 fixed left-0 top-0 flex flex-col justify-between z-50 lg:z-30 lg:translate-x-0 lg:pt-20 transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Navigation Section */}
        <div className="flex flex-col gap-6">
          {/* Logo on mobile menu (hidden on desktop because of TopAppBar) */}
          <div className="flex items-center justify-between px-2 mb-2 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-lg">
                M
              </div>
              <span className="font-sans font-bold text-xl tracking-tight text-[#111c2d]">
                Me<span className="text-primary">Task</span>
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-200 text-slate-500"
            >
              <span className="material-symbols-outlined block text-[22px]">close</span>
            </button>
          </div>

          {/* Nav List */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? "bg-blue-50 text-primary border-l-4 border-primary pl-3"
                      : "text-slate-600 hover:bg-slate-100 hover:text-[#111c2d]"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:scale-105 ${
                      isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Action Panel: PWA Install and Logout */}
        <div className="mt-auto flex flex-col gap-4">
          {/* PWA Install Button */}
          {!isStandalone && (
            <div className="px-2">
              <button
                onClick={handleInstallClick}
                className="flex items-center justify-center gap-2 w-full bg-primary hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-3 rounded-lg shadow-md shadow-blue-500/15 hover:shadow-blue-500/25 active:scale-95 transition-all duration-150 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Tải App MeTask
              </button>
            </div>
          )}

          {/* Logout Button */}
          <div className="border-t border-[#cfdaf2] pt-4">
            <button
              onClick={async () => {
                await logout();
                window.location.href = "/login";
              }}
              className="flex items-center justify-center gap-2 w-full bg-white hover:bg-red-50 hover:text-red-600 text-slate-600 font-bold text-xs py-2.5 px-3 rounded-lg border border-[#cfdaf2] shadow-xs active:scale-95 transition-all duration-150 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Đăng xuất
            </button>
          </div>
        </div>
      </aside>

      {/* PWA Install Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#cfdaf2] rounded-xl shadow-2xl max-w-md w-full p-6 text-sm animate-scale-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-base text-[#111c2d] flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">download</span>
                Tải Ứng Dụng MeTask
              </h3>
              <button
                onClick={() => setShowInstructions(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <span className="material-symbols-outlined block text-[22px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-4 text-slate-600">
              <p className="text-xs leading-relaxed">
                Ứng dụng hỗ trợ cài đặt dạng **PWA (Progressive Web App)** giúp mở ứng dụng nhanh từ màn hình chính và làm việc ngoại tuyến (offline):
              </p>
              
              {/* Option 1: Chrome/Edge Desktop */}
              <div className="border-l-4 border-primary pl-3 py-0.5">
                <h4 className="font-bold text-xs text-[#111c2d] uppercase">Cách 1: Máy tính (Chrome / Edge / Opera)</h4>
                <p className="text-xs mt-1 text-slate-500 leading-relaxed">
                  Nhìn lên **góc phải thanh địa chỉ** trình duyệt của bạn (cạnh dấu ngôi sao bookmark), nhấp vào biểu tượng **Cài đặt** (hình màn hình máy tính có mũi tên xuống <span className="material-symbols-outlined text-[16px] inline-block align-middle">install_desktop</span> hoặc bấm biểu tượng dấu cộng <span className="material-symbols-outlined text-[16px] inline-block align-middle">add_to_home_screen</span>) và chọn **Cài đặt (Install)**.
                </p>
              </div>

              {/* Option 2: Mobile Safari iOS */}
              <div className="border-l-4 border-amber-500 pl-3 py-0.5">
                <h4 className="font-bold text-xs text-[#111c2d] uppercase">Cách 2: iPhone / iPad (Safari)</h4>
                <p className="text-xs mt-1 text-slate-500 leading-relaxed">
                  Bấm biểu tượng **Chia sẻ (Share)** ở thanh dưới cùng của Safari (<span className="material-symbols-outlined text-[16px] inline-block align-middle">share</span>), cuộn xuống và chọn **Thêm vào MH chính (Add to Home Screen)**.
                </p>
              </div>

              {/* Option 3: Mobile Chrome Android */}
              <div className="border-l-4 border-emerald-500 pl-3 py-0.5">
                <h4 className="font-bold text-xs text-[#111c2d] uppercase">Cách 3: Android (Chrome)</h4>
                <p className="text-xs mt-1 text-slate-500 leading-relaxed">
                  Bấm biểu tượng ba chấm (<span className="material-symbols-outlined text-[16px] inline-block align-middle">more_vert</span>) ở góc trên cùng bên phải, chọn **Cài đặt ứng dụng (Install app)** hoặc **Thêm vào màn hình chính**.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowInstructions(false)}
              className="w-full bg-primary hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg shadow-md mt-6 transition-all active:scale-98"
            >
              Tôi đã rõ
            </button>
          </div>
        </div>
      )}

      {/* Style for animation */}
      <style jsx global>{`
        @keyframes scaleUp {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-up {
          animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </>
  );
}
