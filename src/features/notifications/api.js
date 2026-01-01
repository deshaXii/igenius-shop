// frontend/src/features/notifications/api.js
import axios from "axios";
import useAuthStore from "../auth/authStore";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "https://igenius-shop-api.vercel.app/api",
});

export const fetchNotifications = async (token) => {
  const { data } = await API.get("/notifications", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const markAsRead = async (id, token) => {
  await API.put(`/notifications/${id}/read`, null, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const clearNotifications = async (token) => {
  await API.delete("/notifications/clear", {
    headers: { Authorization: `Bearer ${token}` },
  });
};
