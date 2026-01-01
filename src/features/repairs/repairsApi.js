// src/features/repairs/repairsApi.js
import API from "../../lib/api";
import { selectValueToStatusPatch } from "../../utils/data";

// List (مع فلاتر اختيارية)
export async function listRepairs(params = {}) {
  return API.get("/repairs", { params }).then((r) => r.data);
}

// Get one
export async function getRepair(id) {
  return API.get(`/repairs/${id}`).then((r) => r.data);
}

// Create
export async function createRepair(payload) {
  return API.post("/repairs", payload).then((r) => r.data);
}

// Update (عام)
export async function updateRepair(id, payload) {
  return API.put(`/repairs/${id}`, payload).then((r) => r.data);
}

// Update status (فني معيّن: يتطلب password)
export async function updateRepairStatus(id, { status, password, rejectedDeviceLocation }) {
  // ✅ دعم "مرفوض في المحل/مرفوض مع العميل" لو اتبعتوا كما هم
  const patch = selectValueToStatusPatch(status);
  const normalizedStatus = patch.status;
  const normalizedLoc = rejectedDeviceLocation || patch.rejectedDeviceLocation;

  const body = { status: normalizedStatus };
  if (password) body.password = password;

  if (normalizedStatus === "مرفوض" && normalizedLoc) {
    body.rejectedDeviceLocation = normalizedLoc; // 'بالمحل' أو 'مع العميل'
  }

  return API.put(`/repairs/${id}`, body).then((r) => r.data);
}

// Set or update warranty
export async function setWarranty(id, { hasWarranty = true, warrantyEnd, warrantyNotes = "" }) {
  const body = { hasWarranty, warrantyEnd, warrantyNotes };
  return API.post(`/repairs/${id}/warranty`, body).then((r) => r.data);
}

// Create customer-facing update
export async function createCustomerUpdate(id, payload) {
  return API.post(`/repairs/${id}/customer-updates`, payload)
    .then((r) => r.data)
    .catch((err) => {
      console.log(err);
      throw new Error(err.response?.data?.message || "حدث خطأ أثناء إرسال التحديث للعميل");
    });
}
