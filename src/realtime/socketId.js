// src/realtime/socketId.js
let _id = null;
export function setSocketId(id) {
  _id = id || null;
  try {
    localStorage.setItem("socket_id", _id || "");
  } catch {}
}
export function getSocketId() {
  return (
    _id ||
    (typeof localStorage !== "undefined"
      ? localStorage.getItem("socket_id") || null
      : null)
  );
}
