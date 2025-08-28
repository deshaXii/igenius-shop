import React from "react";
import { Navigate } from "react-router-dom";
import useAuthStore from "../pages/auth/authStore";

const AuthGuard = ({ children }) => {
  const { token, isExpired } = useAuthStore();

  if (!token || isExpired()) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default AuthGuard;
