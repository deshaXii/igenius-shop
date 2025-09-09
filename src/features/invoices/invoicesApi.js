import axios from "axios";
import useAuthStore from "../auth/authStore";

const BASE_URL = "https://igenius-shop-api-vercel.app/api/invoices";

export const fetchDailyProfits = async (date) => {
  const { token } = useAuthStore.getState();
  const { data } = await axios.get(`${BASE_URL}/daily?date=${date}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const fetchTechnicianProfits = async (date) => {
  const { token } = useAuthStore.getState();
  const { data } = await axios.get(`${BASE_URL}/technicians?date=${date}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const fetchPartSuppliers = async (date) => {
  const { token } = useAuthStore.getState();
  const { data } = await axios.get(`${BASE_URL}/suppliers?date=${date}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};
