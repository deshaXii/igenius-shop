// src/realtime/NotificationsLive.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import API from "../lib/api";
import useAuthStore from "../features/auth/authStore";

// Toast بسيط
function Toast({ n, onClose, onOpen }) {
  useEffect(() => {
    const t = setTimeout(onClose, 7000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="flex items-start gap-2 p-3 rounded-xl shadow-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-[min(92vw,380px)]">
      <div className="text-xl">🔔</div>
      <div className="flex-1">
        <div className="font-semibold mb-0.5">إشعار جديد</div>
        <div className="text-sm text-[16px] opacity-90 break-words">
          {n.message || "لديك إشعار جديد"}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={onOpen}
            className="px-3 py-1 rounded-lg bg-blue-600 text-white text-sm"
          >
            فتح
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-gray-200 dark:bg-gray-800 text-sm"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NotificationsLive() {
  const nav = useNavigate();
  const { user } = useAuthStore();
  async function markRead(id) {
    try {
      await API.put(`/notifications/${id}/read`);
    } catch {}
  }
  const token = useMemo(() => {
    // حاول تجيب التوكن من الستور أو localStorage
    const tStore = user?.token || user?.accessToken || user?.jwt;
    const tLS =
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("jwt");
    return tStore || tLS || null;
  }, [user]);

  const [toasts, setToasts] = useState([]);
  const knownIdsRef = useRef(new Set()); // IDs أظهرناها بالفعل

  // طلب إذن إشعارات المتصفح مرة واحدة
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // مساعدة: افتح رابط مناسب من meta
  function openTarget(n) {
    const meta = n.meta || {};
    if (n.type === "repair" && meta.repairId) {
      nav(`/repairs/${meta.repairId}`);
    } else if (n.type === "chat" && (meta.dmUserId || meta.threadId)) {
      nav(
        meta.dmUserId
          ? `/chat/dm/${meta.dmUserId}`
          : `/chat/thread/${meta.threadId}`
      );
    } else {
      nav("/notifications");
    }
  }

  // أظهر توست + إشعار متصفح
  function show(n) {
    const id = String(n._id || Math.random());
    if (knownIdsRef.current.has(id)) return;
    knownIdsRef.current.add(id);

    setToasts((T) => [{ id, data: n }, ...T].slice(0, 5));

    // Browser Notification (لو مسموح)
    if ("Notification" in window && Notification.permission === "granted") {
      const notif = new Notification("إشعار جديد", {
        body: n.message || "لديك إشعار جديد",
        tag: id,
      });
      notif.onclick = () => {
        window.focus?.();
        openTarget(n);
        notif.close();
      };
    }
  }

  // اتصال Socket.IO + Fallback Polling
  useEffect(() => {
    let closed = false;
    let pollTimer = null;

    const baseURL =
      (API.defaults?.baseURL || "").replace(/\/api\/?$/i, "") ||
      window.location.origin.replace(/:\d+$/, ":5000"); // fallback

    function startPolling() {
      // كل دقيقة هات غير المقروء واعرض أول عناصر جديدة فقط
      const poll = async () => {
        try {
          const items = await API.get("/notifications", {
            params: { unread: true, limit: 10 },
          }).then((r) => r.data);
          (Array.isArray(items) ? items : []).forEach(show);
        } catch (err) {
          console.log(err);
          /* تجاهل */
        }
        if (!closed) pollTimer = setTimeout(poll, 60000);
      };
      poll();
    }

    // بما إن Vercel مش بتدعم socket.io → نستخدم polling مباشرة
    startPolling();
    return () => {
      closed = true;
      clearTimeout(pollTimer);
    };
  }, [token]);

  return (
    <div className="fixed bottom-10 left-2 z-[2000] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast
            timeout={33333333333}
            n={t.data}
            onOpen={async () => {
              await markRead(t.data._id);
              setToasts((T) => T.filter((x) => x.id !== t.id));
              openTarget(t.data);
            }}
            onClose={async () => {
              await markRead(t.data._id);
              setToasts((T) => T.filter((x) => x.id !== t.id));
            }}
          />
        </div>
      ))}
    </div>
  );
}
