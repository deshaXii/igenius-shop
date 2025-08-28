import { Navigate, Outlet } from "react-router-dom";
import useAuthStore from "./authStore";

export default function PublicOnlyRoute() {
  const tokenInStore = useAuthStore((s) => s.token);
  const userInStore = useAuthStore((s) => s.user);

  const token = tokenInStore || localStorage.getItem("token");
  let user = userInStore;
  if (!user) {
    try {
      user = JSON.parse(localStorage.getItem("user") || "null");
    } catch {}
  }

  const authed = Boolean(token) && Boolean(user);
  return authed ? <Navigate to="/repairs" replace /> : <Outlet />;
}
