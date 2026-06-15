"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface TopAppBarProps {
  onToggleSidebar: () => void;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

export default function TopAppBar({ onToggleSidebar }: TopAppBarProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [searchFocused, setSearchFocused] = useState(false);
  
  // Notification states
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch("/api/notifications/unread");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count);
      }
    } catch (err) {
      console.error("Failed to fetch unread count", err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  // Poll for unread notification count
  useEffect(() => {
    if (!user) return;

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [user]);

  // Fetch full notifications when dropdown opens
  useEffect(() => {
    if (showDropdown) {
      fetchNotifications();
    }
  }, [showDropdown]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setUnreadCount(0);
        fetchNotifications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    try {
      // Mark as read on server
      if (!notif.isRead) {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationId: notif.id }),
        });
        fetchUnreadCount();
      }
      setShowDropdown(false);
      
      // Redirect if link exists
      if (notif.link) {
        router.push(notif.link);
      }
    } catch (err) {
      console.error(err);
    }
  };

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
            M
          </div>
          <span className="font-sans font-bold text-xl tracking-tight text-[#111c2d]">
            Me<span className="text-primary">Task</span>
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
      <div className="flex items-center gap-3 relative" ref={dropdownRef}>
        {/* Search toggle for mobile */}
        <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 md:hidden transition-colors">
          <span className="material-symbols-outlined block text-[22px]">search</span>
        </button>

        {/* Notification bell */}
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 relative transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined block text-[22px]">notifications</span>
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-4.5 h-4.5 px-1 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Notifications Dropdown Panel */}
        {showDropdown && (
          <div className="absolute right-0 top-12 w-80 bg-white border border-[#cfdaf2] rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-[400px] animate-scale-up">
            <div className="p-4 border-b border-[#cfdaf2] bg-slate-50 flex items-center justify-between">
              <span className="font-bold text-xs text-[#111c2d]">Thông báo của bạn</span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[10px] font-bold text-primary hover:underline"
                >
                  Đọc tất cả
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-1">
                  <span className="material-symbols-outlined text-[32px]">notifications_off</span>
                  <span>Không có thông báo nào.</span>
                </div>
              ) : (
                <div className="flex flex-col">
                  {notifications.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-3.5 text-left border-b border-slate-100 transition-colors flex flex-col gap-1 w-full text-xs hover:bg-slate-50/50 ${
                        !notif.isRead ? "bg-blue-50/40" : ""
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-bold text-[#111c2d]">{notif.title}</span>
                        <span className="text-[9px] text-slate-400 whitespace-nowrap">
                          {new Date(notif.createdAt).toLocaleDateString("vi-VN", {
                            month: "numeric",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                      <p className="text-slate-500 leading-relaxed">{notif.message}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

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
