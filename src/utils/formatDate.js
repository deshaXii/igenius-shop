// src/utils/formatDate.js
export function formatDate(input) {
  if (!input) return "—";
  const d = new Date(input);
  if (isNaN(d)) return String(input);
  // مثال: 2025/08/19 14:32
  return d.toLocaleString("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
export default formatDate;
