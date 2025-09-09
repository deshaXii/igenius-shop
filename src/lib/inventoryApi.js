import API from "./api";

// Inventory
export async function listInventory(params = {}) {
  const { data } = await API.get("/inventory", { params });
  return data;
}
export async function createInventoryItem(payload) {
  const { data } = await API.post("/inventory", payload);
  return data;
}
export async function editInventoryItem(id, payload) {
  const { data } = await API.put(`/inventory/${id}`, payload);
  return data;
}
export async function deleteInventoryItem(id) {
  const { data } = await API.delete(`/inventory/${id}`);
  return data;
}
