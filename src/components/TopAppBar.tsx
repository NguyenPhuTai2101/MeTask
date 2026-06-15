"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";

interface TopAppBarProps {
  onToggleSidebar: () => void;
}

export default function TopAppBar({ onToggleSidebar }: TopAppBarProps) {
  const { user } = useAuth();
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header className="h-16 px-6 border-b border-[#cfdaf2] flex items-center justify-between sticky top-0 bg-white z-50 transition-all duration-200">
      {/* Left: Hamburger & Logo */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 -ml-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors lg:hidden"
          aria-label="Toggle menu"
        >
          <span className="material-symbols-outlined block text-[24px]">menu</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-lg shadow-md shadow-blue-500/20">
            N
          </div>
          <span className="font-sans font-bold text-xl tracking-tight text-[#111c2d]">
            Nexus<span className="text-primary">PM</span>
          </span>
        </div>
      </div>

      {/* Center: Search Bar */}
      <div className="flex-1 max-w-md mx-8 hidden md:block">
        <div
          className={`relative flex items-center h-10 w-full rounded-lg bg-slate-50 border transition-all duration-200 ${
            searchFocused
              ? "border-primary bg-white shadow-sm ring-2 ring-blue-500/10"
              : "border-[#cfdaf2]"
          }`}
        >
          <span className="material-symbols-outlined ml-3 text-[20px] text-slate-400 select-none">
            search
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm dự án, tác vụ..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full h-full px-3 text-sm text-slate-700 bg-transparent border-0 outline-none placeholder-slate-400"
          />
        </div>
      </div>

      {/* Right: Notifications, Help, User Session */}
      <div className="flex items-center gap-3">
        {/* Search toggle for mobile */}
        <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 md:hidden transition-colors">
          <span className="material-symbols-outlined block text-[22px]">search</span>
        </button>

        {/* Notification bell */}
        <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 relative transition-colors">
          <span className="material-symbols-outlined block text-[22px]">notifications</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white"></span>
        </button>

        {/* Help */}
        <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hidden sm:block transition-colors">
          <span className="material-symbols-outlined block text-[22px]">help</span>
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

        {/* User Profile Info */}
        {user && (
          <div className="flex items-center gap-3 pl-1">
            <div className="text-right hidden lg:block">
              <p className="text-sm font-semibold text-[#111c2d] leading-none">
                {user.fullName}
              </p>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {user.role}
              </p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={user.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
              alt={user.fullName}
              className="w-8 h-8 rounded-full border border-slate-100 object-cover shadow-sm ring-2 ring-slate-100"
            />
          </div>
        )}
      </div>
    </header>
  );
}
