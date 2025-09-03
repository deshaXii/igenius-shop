// src/features/repairs/repairsApi.js
import API from "../../lib/api";

// List (مع فلاتر اختيارية)
export function listRepairs(params = {}) {
  return API.get("/repairs", { params }).then((r) => r.data);
}

// Get one
export function getRepair(id) {
  return API.get(`/repairs/${id}`).then((r) => r.data);
}

// Create
export function createRepair(payload) {
  return API.post("/repairs", payload).then((r) => r.data);
}

// Update (عام)
export function updateRepair(id, payload) {
  return API.put(`/repairs/${id}`, payload).then((r) => r.data);
}

// Update status (فني معيّن: يتطلب password)
export function updateRepairStatus(
  id,
  { status, password, rejectedDeviceLocation }
) {
  const body = { status };
  if (password) body.password = password;
  if (status === "مرفوض" && rejectedDeviceLocation) {
    body.rejectedDeviceLocation = rejectedDeviceLocation; // 'بالمحل' أو 'مع العميل'
  }
  return API.put(`/repairs/${id}`, body).then((r) => r.data);
}

// Set or update warranty
export function setWarranty(id, { hasWarranty = true, warrantyEnd, warrantyNotes = "" }) {
  const body = { hasWarranty, warrantyEnd, warrantyNotes };
  return API.post(`/repairs/${id}/warranty`, body).then((r) => r.data);
}

// Create customer-facing update
export function createCustomerUpdate(id, payload) {
  return API.post(`/repairs/${id}/customer-updates`, payload).then((r) => r.data);
}