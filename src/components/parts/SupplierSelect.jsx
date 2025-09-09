import { useEffect, useMemo, useState } from "react";
import { listSuppliers } from "../../lib/suppliersApi";

export default function SupplierSelect({
  value, // supplierId || "" (أولوية للـID)
  onChange, // (id, supplierObj) => void
  allowClear = true,
  className = "inp w-full",
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const sorted = useMemo(() => {
    const shopFirst = [...items].sort((a, b) => {
      if (a.isShop && !b.isShop) return -1;
      if (!a.isShop && b.isShop) return 1;
      return a.name.localeCompare(b.name, "ar");
    });
    return shopFirst;
  }, [items]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const data = await listSuppliers();
        if (mounted) setItems(data);
      } finally {
        setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  return (
    <select
      value={value || ""}
      onChange={(e) => {
        const id = e.target.value || "";
        const obj = sorted.find((s) => String(s._id) === String(id)) || null;
        onChange?.(id, obj);
      }}
      className={className}
      disabled={loading}
      title="المورد"
    >
      {allowClear && <option value="">— اختر المورد —</option>}
      {sorted.map((s) => {
        return s.isShop ? (
          <option key={s._id} value={s._id} defaultValue={true}>
            المحل
          </option>
        ) : (
          <option key={s._id} value={s._id}>
            {s.name}
          </option>
        );
      })}
    </select>
  );
}
