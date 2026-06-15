export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    console.warn("Trình duyệt không hỗ trợ Notifications API.");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  try {
    const status = await Notification.requestPermission();
    return status === "granted";
  } catch (e) {
    console.error("Failed to request notification permission", e);
    return false;
  }
}

export function showNotification(title: string, options?: NotificationOptions): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;

  if (Notification.permission === "granted") {
    // Show notification via Service Worker if available for better PWA support
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          ...options,
        });
      });
    } else {
      // Fallback to standard Notification
      new Notification(title, {
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        ...options,
      });
    }
  } else {
    console.warn("Quyền thông báo chưa được cấp.");
  }
}
