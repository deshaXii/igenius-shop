// src/lib/api.js
import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true, // ما بيضرش حتى لو مش بتستخدم كوكي
});

// أين ممكن يكون التوكن مخزّن
const TOKEN_KEYS = ["token", "accessToken", "jwt"];

function getToken() {
  for (const k of TOKEN_KEYS) {
    const v = localStorage.getItem(k);
    if (v) return v;
  }
  return null;
}

API.interceptors.request.use(async (config) => {
  config.headers ||= {};
  // Authorization
  const tok = getToken();
  if (tok) config.headers.Authorization = `Bearer ${tok}`;

  // ↙↙↙ إضافة X-Socket-Id
  try {
    const { getSocketId } = await import("../realtime/socketId");
    const sid = getSocketId();
    if (sid) config.headers["X-Socket-Id"] = sid;
  } catch {}

  return config;
});

// لو 401 → امسح التوكن وارجع للوجن (اختياري)
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      // سيبناها هادئة: امسح التوكن، ودي للمسار /login
      for (const k of TOKEN_KEYS) localStorage.removeItem(k);
      // اختياري: window.location.replace("/login");
    }
    return Promise.reject(err);
  }
);

export default API;
