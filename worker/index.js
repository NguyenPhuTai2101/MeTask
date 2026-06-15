self.addEventListener("push", (event) => {
  try {
    const data = event.data ? event.data.json() : {};
    const title = data.title || "MeTask Notification";
    const options = {
      body: data.body || "Bạn có thông báo mới từ MeTask!",
      icon: data.icon || "/favicon.ico",
      badge: data.badge || "/favicon.ico",
      data: {
        url: data.data?.url || "/dashboard",
      },
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error("Error displaying push notification", err);
    // Fallback to text payload if not JSON
    const text = event.data ? event.data.text() : "Bạn có thông báo mới!";
    event.waitUntil(
      self.registration.showNotification("MeTask", {
        body: text,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        data: { url: "/dashboard" }
      })
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const targetUrl = event.notification.data.url;
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
