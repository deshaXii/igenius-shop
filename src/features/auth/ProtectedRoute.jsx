import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuthStore from "./authStore";

export default function ProtectedRoute() {
  const location = useLocation();

  // من الستور
  const tokenInStore = useAuthStore((s) => s.token);
  const userInStore = useAuthStore((s) => s.user);

  // fallback فوري من localStorage (بدون أي setState)
  const tokenLS = !tokenInStore ? localStorage.getItem("token") : null;
  let userLS = null;
  if (!userInStore) {
    try {
      userLS = JSON.parse(localStorage.getItem("user") || "null");
    } catch {}
  }

  const token = tokenInStore || tokenLS;
  const user = userInStore || userLS;

  const authed = Boolean(token) && Boolean(user);
  if (!authed) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
