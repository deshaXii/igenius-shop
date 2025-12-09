export default function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
