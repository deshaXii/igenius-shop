export default function IncludeNumberField(obj, key, val) {
  if (val === "" || val === null || val === undefined) return obj;
  const n = Number(val);
  return Number.isFinite(n) ? { ...obj, [key]: n } : obj;
}
