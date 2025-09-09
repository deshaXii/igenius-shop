import API from "./api";

// Suppliers
export async function listSuppliers() {
  const { data } = await API.get("/suppliers");
  return data;
}
export async function createSupplier(payload) {
  const { data } = await API.post("/suppliers", payload);
  return data;
}
export async function getSupplier(id) {
  const { data } = await API.get(`/suppliers/${id}`);
  return data;
}
// أجزاء المورد (مجمّعة من الصيانات)
export async function listSupplierParts(id, params = {}) {
  const { data } = await API.get(`/suppliers/${id}/parts`, { params });
  return data;
}
