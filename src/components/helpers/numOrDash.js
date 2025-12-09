export default function numOrDash(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : "—";
}
