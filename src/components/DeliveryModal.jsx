import { useEffect, useState } from "react";
import SupplierSelect from "./parts/SupplierSelect";
import InventoryItemSelect from "./parts/InventoryItemSelect";

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : "";
}

export default function DeliveryModal({
  open,
  onClose,
  onSubmit,
  initialFinalPrice = 0,
  initialParts = [],
  requirePassword = false,
}) {
  const [finalPrice, setFinalPrice] = useState(initialFinalPrice || 0);
  const [price, setPrice] = useState("");
  const [password, setPassword] = useState("");
  const [parts, setParts] = useState([]);

  useEffect(() => {
    if (open) {
      setFinalPrice(initialFinalPrice || 0);
      setParts(
        (initialParts || []).map((p) => ({
          name: p.name || "",
          cost: p.cost ?? "",
          // NEW fields (optional, للتوافق)
          supplierId: p.supplierId || "",
          supplier: p.supplier || "", // نص
          itemId: p.itemId || "",
          itemName: p.itemName || "",
          paid: !!p.paid,
          source: p.source || "",
          purchaseDate: p.purchaseDate
            ? String(p.purchaseDate).slice(0, 10)
            : "",
        }))
      );
      setPassword("");
      setPrice("");
    }
  }, [open, initialFinalPrice, initialParts]);

  function addPart() {
    setParts((prev) => [
      ...prev,
      {
        name: "",
        cost: "",
        supplierId: "",
        supplier: "",
        itemId: "",
        itemName: "",
        paid: false,
        source: "",
        purchaseDate: new Date().toISOString().slice(0, 10),
      },
    ]);
  }
  function updatePart(i, k, v) {
    setParts((prev) => {
      const next = prev.slice();
      next[i] = { ...next[i], [k]: v };
      // Sync الاسم تلقائيًا من صنف المخزن لو فاضي
      if (k === "itemId") {
        const item = v?.obj || null;
      }
      return next;
    });
  }
  function onSupplierChange(i, id, obj) {
    setParts((prev) => {
      const next = prev.slice();
      next[i] = {
        ...next[i],
        supplierId: id,
        supplier: obj ? (obj.isShop ? "المحل" : obj.name) : "",
      };
      return next;
    });
  }
  function onItemChange(i, id, obj) {
    setParts((prev) => {
      const next = prev.slice();
      next[i] = {
        ...next[i],
        itemId: id,
        itemName: obj?.name || next[i].itemName,
      };
      if (!next[i].name && obj?.name) next[i].name = obj.name;
      // لو سعر القطعة فاضي، ومتوفر unitCost من المخزن
      if (
        (next[i].cost === "" || next[i].cost === null) &&
        typeof obj?.unitCost === "number"
      ) {
        next[i].cost = obj.unitCost;
      }
      return next;
    });
  }
  function removePart(i) {
    setParts((prev) => prev.filter((_, idx) => idx !== i));
  }

  function submit() {
    const payload = {
      finalPrice: toNum(finalPrice),
      price: price === "" ? undefined : toNum(price),
      password: requirePassword ? password : undefined,
      parts: parts.map((p) => ({
        name: p.name || p.itemName || "قطعة",
        cost: p.cost === "" || p.cost === null ? 0 : Number(p.cost),
        supplier: p.supplier || undefined, // نص (للتوافق)
        supplierId: p.supplierId || undefined, // ربط بالمورد
        itemId: p.itemId || undefined, // ربط بالمخزن
        itemName: p.itemName || undefined,
        paid: !!p.paid,
        source: p.source || undefined,
        purchaseDate: p.purchaseDate
          ? new Date(p.purchaseDate).toISOString()
          : undefined,
      })),
    };
    onSubmit?.(payload);
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/40">
      <div className="bg-white dark:bg-gray-800 w-[980px] max-w-[95vw] rounded-2xl p-4 space-y-3 shadow-xl">
        <h3 className="text-lg font-semibold">إتمام التسليم</h3>

        <div className="grid md:grid-cols-4 gap-2">
          <div className="md:col-span-2">
            <label className="text-sm text-[16px] opacity-80">
              السعر النهائي *
            </label>
            <input
              type="number"
              className="inp w-full"
              value={finalPrice}
              onChange={(e) => setFinalPrice(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm text-[16px] opacity-80">
              السعر المبدئي (اختياري)
            </label>
            <input
              type="number"
              className="inp w-full"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          {requirePassword && (
            <div>
              <label className="text-sm text-[16px] opacity-80">
                كلمة السر للتأكيد
              </label>
              <input
                type="password"
                className="inp w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* قطع الغيار */}
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">قطع الغيار</h4>
          <button
            onClick={addPart}
            className="px-3 py-1 rounded-lg bg-gray-200 dark:bg-gray-700"
          >
            إضافة قطعة
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right">
                <Th>الصنف (من المخزن)</Th>
                <Th>اسم القطعة</Th>
                <Th>التكلفة</Th>
                <Th>المورد</Th>
                <Th>المُدخل</Th>
                <Th>تاريخ الشراء</Th>
                <Th>مدفوعة؟</Th>
                <Th>حذف</Th>
              </tr>
            </thead>
            <tbody>
              {parts.map((p, i) => (
                <tr key={i} className="odd:bg-gray-50 dark:odd:bg-gray-700/40">
                  <Td className="min-w-[220px]">
                    <InventoryItemSelect
                      value={p.itemId || ""}
                      onChange={(id, obj) => onItemChange(i, id, obj)}
                    />
                  </Td>
                  <Td>
                    <input
                      className="inp w-44"
                      value={p.name}
                      onChange={(e) => updatePart(i, "name", e.target.value)}
                    />
                  </Td>
                  <Td>
                    <input
                      type="number"
                      className="inp w-24"
                      value={p.cost}
                      onChange={(e) => updatePart(i, "cost", e.target.value)}
                    />
                  </Td>
                  <Td className="min-w-[180px]">
                    <SupplierSelect
                      value={p.supplierId || ""}
                      onChange={(id, obj) => onSupplierChange(i, id, obj)}
                    />
                  </Td>
                  <Td>
                    <input
                      className="inp w-28"
                      value={p.source || ""}
                      onChange={(e) => updatePart(i, "source", e.target.value)}
                      placeholder="مثلاً: أحمد"
                    />
                  </Td>
                  <Td>
                    <input
                      type="date"
                      className="inp w-40"
                      value={p.purchaseDate || ""}
                      onChange={(e) =>
                        updatePart(i, "purchaseDate", e.target.value)
                      }
                    />
                  </Td>
                  <Td className="text-center">
                    <input
                      type="checkbox"
                      checked={!!p.paid}
                      onChange={(e) => updatePart(i, "paid", e.target.checked)}
                    />
                  </Td>
                  <Td>
                    <button
                      onClick={() => removePart(i)}
                      className="px-2 py-1 rounded-lg bg-red-500 text-white"
                    >
                      حذف
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-2">
          <button className="px-3 py-2 rounded-xl border" onClick={onClose}>
            إلغاء
          </button>
          <button
            className="px-3 py-2 rounded-xl bg-blue-600 text-white"
            onClick={submit}
          >
            تم
          </button>
        </div>

        <style>{`.inp{padding:.5rem .75rem;border-radius:.75rem;background:var(--inp-bg,#f3f4f6);}`}</style>
      </div>
    </div>
  );
}

function Th({ children }) {
  return (
    <th className="p-2 text-xs font-semibold text-gray-600 dark:text-gray-300 border-b">
      {children}
    </th>
  );
}
function Td({ children, className = "" }) {
  return <td className={`p-2 ${className}`}>{children}</td>;
}
