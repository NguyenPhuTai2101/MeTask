"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "space_dashboard" },
  { label: "Kanban", href: "/board", icon: "view_kanban" },
  { label: "Workload", href: "/workload", icon: "group" },
  { label: "Cấu hình", href: "/settings", icon: "settings" },
];

export default function BottomNavBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 border-t border-[#cfdaf2] bg-white flex items-center justify-around px-2 pb-safe z-40 lg:hidden shadow-lg shadow-slate-900/10">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-slate-500 transition-colors ${
              isActive ? "text-primary" : "hover:text-slate-700"
            }`}
          >
            <span
              className={`material-symbols-outlined text-[24px] ${
                isActive ? "text-primary fill-1" : "text-slate-400"
              }`}
            >
              {item.icon}
            </span>
            <span className="text-[10px] font-sans font-medium mt-0.5 tracking-tight">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
