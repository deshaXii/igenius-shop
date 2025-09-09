// src/realtime/SocketProvider.jsx
import { createContext, useContext, useEffect, useMemo } from "react";
import { io } from "socket.io-client";
import useAuthStore from "../features/auth/authStore"; // عدّل المسار حسب مشروعك
import { setSocketId } from "./socketId";

const SocketCtx = createContext(null);
export const useSocket = () => useContext(SocketCtx);

export default function SocketProvider({ children }) {
  const token = useAuthStore((s) => s.token); // جيب توكن المستخدم بعد اللوجين

  const socket = useMemo(() => {
    if (!token) return null;
    // استخدم نفس VITE_API_URL واحذف /api لاتصال السوكِت
    const base =
      import.meta.env.VITE_API_URL?.replace(/\/api$/, "") ||
      window.location.origin;
    return io(base, {
      path: "/socket.io",
      cors: {
        origin:
          process.env.NODE_ENV === "development"
            ? "http://localhost:3000"
            : "https://igenius-shop-vercel.app",
        credentials: true,
      },
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 10000,
      withCredentials: true,
      auth: { token },
    });
  }, [token]);

  useEffect(() => {
    if (!socket) return;
    const onConnect = () => {
      console.log("[socket] connected", socket.id);
      setSocketId(socket.id);
    };
    const onErr = (e) =>
      console.warn("[socket] connect_error", e?.message || e);
    socket.on("connect", onConnect);
    socket.on("connect_error", onErr);
    return () => {
      socket.off("connect", onConnect);
      socket.off("connect_error", onErr);
      socket.close();
    };
  }, [socket]);

  return <SocketCtx.Provider value={socket}>{children}</SocketCtx.Provider>;
}
