"use client";

import React, { useState } from "react";
import TopAppBar from "@/components/TopAppBar";
import SideNavBar from "@/components/SideNavBar";
import BottomNavBar from "@/components/BottomNavBar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      {/* Top Header Bar */}
      <TopAppBar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Layout Area */}
      <div className="flex flex-1 relative">
        {/* Navigation Sidebar */}
        <SideNavBar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Content Panel */}
        <main className="flex-1 w-full lg:pl-64 flex flex-col min-h-[calc(100vh-64px)] pb-16 lg:pb-0 transition-all duration-300">
          <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNavBar />
    </div>
  );
}
