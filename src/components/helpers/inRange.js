export default function InRange(dateISO, startStr, endStr) {
  if (!dateISO || !startStr || !endStr) return false;
  const d = new Date(dateISO);
  const start = new Date(`${startStr}T00:00:00`);
  const end = new Date(`${endStr}T23:59:59.999`);
  return d >= start && d <= end;
}
