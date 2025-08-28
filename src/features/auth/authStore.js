// src/features/auth/authStore.js
import { create } from "zustand";

const DAY_MS = 24 * 60 * 60 * 1000;

const useAuthStore = create((set, get) => ({
  token: localStorage.getItem("token") || null,
  user: JSON.parse(localStorage.getItem("user") || "null"),
  loginTime: parseInt(localStorage.getItem("loginTime") || "0", 10) || null,

  isExpired: () => {
    const t = get().loginTime;
    if (!t) return true;
    return Date.now() - t > DAY_MS;
  },

  login: (token, user) => {
    const now = Date.now();
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("loginTime", String(now));
    set({ token, user, loginTime: now });
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("loginTime");
    set({ token: null, user: null, loginTime: null });
  },
}));

export default useAuthStore;
