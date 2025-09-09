import { useEffect, useMemo, useState } from "react";
import { listInventory } from "../../lib/inventoryApi";

export default function InventoryItemSelect({
  value, // itemId || ""
  onChange, // (id, itemObj) => void
  className = "inp w-full",
  placeholder = "اختر/ابحث عن صنف من المخزن",
}) {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const filtered = useMemo(() => {
    if (!q.trim()) return items;
    const t = q.trim().toLowerCase();
    return items.filter(
      (it) =>
        it.name?.toLowerCase().includes(t) ||
        it.sku?.toLowerCase().includes(t) ||
        it.category?.toLowerCase().includes(t)
    );
  }, [items, q]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const data = await listInventory();
        if (mounted) setItems(data);
      } finally {
        setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  return (
    <div className="space-y-1">
      <input
        placeholder={placeholder}
        className="inp w-full"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <select
        value={value || ""}
        onChange={(e) => {
          const id = e.target.value || "";
          const obj =
            filtered.find((s) => String(s._id) === String(id)) || null;
          onChange?.(id, obj);
        }}
        className={className}
        disabled={loading}
        title="عنصر المخزن"
      >
        <option value="">— اختر صنف —</option>
        {filtered.map((it) => (
          <option key={it._id} value={it._id}>
            {it.name} {it.sku ? `— ${it.sku}` : ""}{" "}
            {it.category ? `(${it.category})` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
