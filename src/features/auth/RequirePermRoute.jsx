import { Navigate, Outlet } from "react-router-dom";
import useAuthStore from "./authStore";

export default function RequirePermRoute({
  adminOnly = false,
  perm = null,
  to = "/repairs",
}) {
  const { user } = useAuthStore.getState();
  const isAdmin = user?.role === "admin" || user?.permissions?.adminOverride;
  const has = perm ? !!user?.permissions?.[perm] : false;

  if (adminOnly) return isAdmin ? <Outlet /> : <Navigate to={to} replace />;
  if (perm) return isAdmin || has ? <Outlet /> : <Navigate to={to} replace />;
  return <Outlet />;
}
