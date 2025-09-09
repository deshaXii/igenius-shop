// src/lib/api.js
import axios from "axios";

const API = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL || "https://igenius-shop-api.vercel.app/api",
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

export const DepartmentsAPI = {
  list: () => API.get("/departments").then((r) => r.data),
  create: (data) => API.post("/departments", data).then((r) => r.data),
  update: (id, data) => API.put(`/departments/${id}`, data).then((r) => r.data),
  remove: (id) => API.delete(`/departments/${id}`).then((r) => r.data),
  assignMonitor: (id, userId) =>
    API.put(`/departments/${id}/monitor`, { userId }).then((r) => r.data),
  technicians: (id) =>
    API.get(`/departments/${id}/technicians`).then((r) => r.data),
};
export const RepairsAPI = {
  create: (data) => API.post("/repairs", data).then((r) => r.data), // يدعم initialDepartment و technician
  timeline: (id) => API.get(`/repairs/${id}/timeline`).then((r) => r.data),
  assignTech: (id, payload) =>
    API.put(`/repairs/${id}/assign-tech`, payload).then((r) => r.data),
  completeStep: (id, payload) =>
    API.put(`/repairs/${id}/complete-step`, payload).then((r) => r.data),
  moveNext: (id, payload) =>
    API.put(`/repairs/${id}/move-next`, payload).then((r) => r.data),
};
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
