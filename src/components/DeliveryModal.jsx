// src/components/DeliveryModal.jsx
import { useEffect, useState } from "react";

export default function DeliveryModal({
  open,
  onClose,
  onSubmit, // ({ finalPrice, parts, password? })
  initialFinalPrice = 0,
  initialParts = [],
  requirePassword = false,
}) {
  const [finalPrice, setFinalPrice] = useState(initialFinalPrice || 0);
  const [parts, setParts] = useState([]);
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (open) {
      setFinalPrice(initialFinalPrice || 0);
      setParts(
        (initialParts || []).map((p) => ({
          name: p.name || "",
          source: p.source || "",
          supplier: p.supplier || "",
          // لو ISO → نحول ل yyyy-mm-dd للإنبوت
          purchaseDate: p.purchaseDate
            ? new Date(p.purchaseDate).toISOString().slice(0, 10)
            : "",
          cost: p.cost ?? "",
        }))
      );
      setPassword("");
    }
  }, [open, initialFinalPrice, initialParts]);

  function addPart() {
    setParts((arr) => [
      ...arr,
      {
        name: "",
        source: "",
        supplier: "",
        purchaseDate: new Date().toISOString().slice(0, 10),
        cost: "",
      },
    ]);
  }

  function updatePart(i, k, v) {
    setParts((arr) => {
      const a = arr.slice();
      a[i] = { ...a[i], [k]: v };
      return a;
    });
  }

  function removePart(i) {
    setParts((arr) => arr.filter((_, idx) => idx !== i));
  }

  function submit() {
    const fp = Number(finalPrice) || 0;
    const cleanParts = parts
      .filter((p) => (p.name || "").trim() !== "" || p.cost) // لو اسم فاضي بالكامل وسيبها مفيش مشكله؛ لكن بنشيل الصفوف الفاضية
      .map((p) => ({
        name: (p.name || "").trim(),
        source: (p.source || "").trim() || undefined,
        supplier: (p.supplier || "").trim() || undefined,
        purchaseDate: p.purchaseDate
          ? new Date(p.purchaseDate).toISOString()
          : undefined,
        cost: p.cost ? Number(p.cost) : 0,
      }));
    const payload = { finalPrice: fp, parts: cleanParts };
    if (requirePassword) {
      if (!password) {
        alert("مطلوب كلمة السر للتأكيد");
        return;
      }
      payload.password = password;
    }
    onSubmit?.(payload);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50">
      <div className="w-[95vw] max-w-3xl rounded-2xl bg-white dark:bg-gray-900 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">
            تأكيد التسليم — السعر النهائي وقطع الغيار
          </h2>
          <button
            onClick={onClose}
            className="px-2 py-1 rounded-lg bg-gray-200 dark:bg-gray-700"
          >
            إغلاق
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <label className="space-y-1">
            <div className="text-sm opacity-80">السعر النهائي</div>
            <input
              type="number"
              value={finalPrice}
              onChange={(e) => setFinalPrice(e.target.value)}
              className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800"
            />
          </label>
          {requirePassword && (
            <label className="space-y-1">
              <div className="text-sm opacity-80">
                كلمة السر (للفني المعيّن)
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800"
              />
            </label>
          )}
        </div>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">قطع الغيار</h3>
            <button
              onClick={addPart}
              className="px-3 py-1 rounded-lg bg-gray-200 dark:bg-gray-700"
            >
              + إضافة قطعة
            </button>
          </div>
          {parts.length === 0 ? (
            <div className="opacity-70">لا توجد قطع</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-right">
                    <th className="p-2">الاسم</th>
                    <th className="p-2">بواسطة</th>
                    <th className="p-2">المورد</th>
                    <th className="p-2">تاريخ الشراء</th>
                    <th className="p-2">التكلفة</th>
                    <th className="p-2">حذف</th>
                  </tr>
                </thead>
                <tbody>
                  {parts.map((p, i) => (
                    <tr
                      key={i}
                      className="odd:bg-gray-50 dark:odd:bg-gray-800/40"
                    >
                      <td className="p-2">
                        <input
                          value={p.name}
                          onChange={(e) =>
                            updatePart(i, "name", e.target.value)
                          }
                          className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-900"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          value={p.source}
                          onChange={(e) =>
                            updatePart(i, "source", e.target.value)
                          }
                          className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-900"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          value={p.supplier}
                          onChange={(e) =>
                            updatePart(i, "supplier", e.target.value)
                          }
                          className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-900"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="date"
                          value={p.purchaseDate || ""}
                          onChange={(e) =>
                            updatePart(i, "purchaseDate", e.target.value)
                          }
                          className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-900"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={p.cost}
                          onChange={(e) =>
                            updatePart(i, "cost", e.target.value)
                          }
                          className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-900 w-28"
                        />
                      </td>
                      <td className="p-2">
                        <button
                          onClick={() => removePart(i)}
                          className="px-2 py-1 rounded-lg bg-red-500 text-white"
                        >
                          حذف
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-gray-700"
          >
            إلغاء
          </button>
          <button
            onClick={submit}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white"
          >
            تأكيد التسليم
          </button>
        </div>
      </div>
    </div>
  );
}
