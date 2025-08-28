// src/realtime/NotificationsBridge.jsx
import { useEffect } from "react";
import { useSocket } from "./SocketProvider";

// Map socket events -> window events that pages already listen to
const EVENT_MAP = {
  "repairs:changed": "repairs:refresh",
  "notifications:changed": "notifications:refresh",
  "invoices:changed": "invoices:refresh",
  "technicians:changed": "technicians:refresh",
  "parts:changed": "parts:refresh",
  "accounts:changed": "accounts:refresh",
  "settings:changed": "settings:refresh",
};

function extractIdFromPath(path) {
  // أمثلة: /api/repairs/66cf1d0a2f6a0a2a3c9c7d39
  const m =
    typeof path === "string" && path.match(/^\/api\/repairs\/([a-f0-9]{24})/i);
  return m ? m[1] : null;
}

export default function NotificationsBridge() {
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handlers = [];
    for (const [socketEvent, windowEvent] of Object.entries(EVENT_MAP)) {
      const h = (payload) => {
        // تجاهل لو نفس منفّذ العملية
        try {
          const sid = localStorage.getItem("socket_id");
          if (payload?.by && sid && payload.by === sid) return;
        } catch {}

        // لو الحدث يخص repairs و فيه id في الـ path → ارسل حدث تحديث عنصر واحد
        if (socketEvent === "repairs:changed") {
          const id = extractIdFromPath(payload?.path);
          if (id) {
            window.dispatchEvent(
              new CustomEvent("repairs:update-one", { detail: { id, payload } })
            );
            return; // ما نبعتش refresh كامل لو قدرنا نحدّد العنصر
          }
        }

        // الوضع الافتراضي: ابعت الحدث العام (هيعمل load() في الصفحات)
        window.dispatchEvent(new CustomEvent(windowEvent, { detail: payload }));
      };
      socket.on(socketEvent, h);
      handlers.push([socketEvent, h]);
    }

    // دعم قديم لحدث إشعار جديد
    const onNewNotif = (n) => {
      window.dispatchEvent(
        new CustomEvent("notifications:refresh", { detail: n })
      );
    };
    socket.on("notification:new", onNewNotif);
    handlers.push(["notification:new", onNewNotif]);

    return () => handlers.forEach(([evt, h]) => socket.off(evt, h));
  }, [socket]);

  return null;
}
