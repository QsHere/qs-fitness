// Deliberately minimal: this service worker exists for exactly one job -
// showing a system notification when the rest timer finishes, which
// requires a service worker on Android Chrome (the plain `new Notification()`
// constructor isn't supported there). It does not cache anything or handle
// offline behaviour, so it can't accidentally break the rest of the app.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "TIMER_COMPLETE") return;

  self.registration.showNotification(data.title || "Rest complete", {
    body: data.body || "Time for your next set.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: "qsf-rest-timer",
    renotify: true,
    vibrate: [200, 100, 200, 100, 400],
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const existing = clients.find((c) => "focus" in c);
      if (existing) return existing.focus();
      return self.clients.openWindow("/");
    })
  );
});
