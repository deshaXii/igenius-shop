import inRange from "./inRange";

export default function IsOldRepair(r, quick, startStr, endStr) {
  if (quick === "all" || !startStr || !endStr) return false;
  const deliveredIn = inRange(r.deliveryDate, startStr, endStr);
  const createdIn = inRange(r.createdAt, startStr, endStr);
  return deliveredIn && !createdIn;
}
