// src/components/NotificationBell.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../lib/api";

export default function NotificationBell() {
  const [count, setCount] = useState(0);

  async function fetchCount() {
    try {
      const list = await API.get("/notifications").then((r) => r.data);
      setCount(list.filter((n) => !n.read).length);
    } catch (e) {
      // ignore
    }
  }

  async function refreshCount() {
    try {
      const { data } = await API.get("/notifications/unread-count");
      setCount(data?.count || 0);
    } catch {}
  }

  useEffect(() => {
    refreshCount();
    const i = setInterval(refreshCount, 30000);

    const onRefresh = () => refreshCount();
    window.addEventListener("notifications:refresh", onRefresh);
    window.addEventListener("repairs:refresh", onRefresh); // back-compat

    return () => {
      clearInterval(i);
      window.removeEventListener("notifications:refresh", onRefresh);
      window.removeEventListener("repairs:refresh", onRefresh);
    };
  }, []);

  useEffect(() => {
    fetchCount();
    const i = setInterval(fetchCount, 10000); // كل 10 ثواني
    return () => clearInterval(i);
  }, []);

  return (
    <Link to="/notifications" className="relative inline-flex items-center">
      <span className="material-icons">notifications</span>
      {count > 0 && (
        <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs px-1.5 rounded-full">
          {count}
        </span>
      )}
    </Link>
  );
}
