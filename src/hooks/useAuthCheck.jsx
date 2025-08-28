import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../features/auth/authStore.js";

const useAuthCheck = () => {
  const navigate = useNavigate();
  const { token, logout } = useAuthStore();

  useEffect(() => {
    const loginTime = Number(localStorage.getItem("loginTime"));
    const expired = Date.now() - loginTime > 60 * 60 * 1000;

    if (!token || expired) {
      logout();
      navigate("/login");
    }
  }, [token]);
};

export default useAuthCheck;
