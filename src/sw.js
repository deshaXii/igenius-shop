/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import {
  NetworkFirst,
  StaleWhileRevalidate,
  CacheFirst,
  NetworkOnly,
} from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

// Injected by VitePWA
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// لا تكاشّي Socket.io نهائيًا
registerRoute(
  ({ url }) => url.pathname.startsWith("/socket.io/"),
  new NetworkOnly()
);

// API → NetworkFirst عشان دايمًا نجيب أحدث داتا
registerRoute(
  ({ url }) => url.pathname.startsWith("/api/"),
  new NetworkFirst({
    cacheName: "api-cache",
    networkTimeoutSeconds: 5,
  })
);

// الأصول الثابتة → Stale-While-Revalidate
registerRoute(
  ({ request, url }) =>
    request.destination === "script" ||
    request.destination === "style" ||
    url.pathname.startsWith("/assets/"),
  new StaleWhileRevalidate({ cacheName: "assets-cache" })
);

// الصور → CacheFirst بحد أقصى
registerRoute(
  ({ request }) => request.destination === "image",
  new CacheFirst({
    cacheName: "image-cache",
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 7 * 24 * 3600 }),
    ],
  })
);

// Push notifications → أرسل للصفحات حدث لتعيد التحميل واعرض إشعار
self.addEventListener("push", (event) => {
  const data = (() => {
    try {
      return event.data?.json() || {};
    } catch {
      return {};
    }
  })();
  const title = data.title || "Aqsa Repair";
  const body = data.body || data.message || "";
  const targetUrl = data.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "PUSH_EVENT", payload: data });
        });
      })
  );

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: targetUrl },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  const targetUrl = event.notification?.data?.url || "/";
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((tabs) => {
        const abs = new URL(targetUrl, self.location.origin).href;
        for (const client of tabs) {
          if (client.url === abs && "focus" in client) return client.focus();
        }
        return self.clients.openWindow(abs);
      })
  );
});

// التحديث الهادي للـ SW
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
