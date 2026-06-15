"use client";

import { useState, useEffect } from "react";

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Ngăn chặn trình duyệt hiển thị banner cài đặt mặc định
      e.preventDefault();
      // Lưu lại event để kích hoạt thủ công khi bấm nút
      setInstallPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Kiểm tra xem ứng dụng đã được cài đặt chưa (standalone mode)
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone
    ) {
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const triggerInstall = async (): Promise<boolean> => {
    if (!installPrompt) {
      console.warn("Cài đặt chưa khả dụng hoặc ứng dụng đã được cài đặt.");
      return false;
    }

    // Hiển thị hộp thoại cài đặt của trình duyệt
    installPrompt.prompt();

    // Chờ phản hồi từ người dùng
    const { outcome } = await installPrompt.userChoice;
    console.log(`Kết quả cài đặt: ${outcome}`);

    if (outcome === "accepted") {
      setInstallPrompt(null);
      setIsInstallable(false);
      return true;
    }
    return false;
  };

  return { isInstallable, triggerInstall };
}
