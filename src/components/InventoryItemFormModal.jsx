import { useEffect, useState } from "react";
import { SuppliersAPI } from "../lib/api";

const DEFAULT_ITEM = {
  name: "",
  sku: "",
  type: "accessory", // accessory | part
  unitCost: "",
  salePrice: "",
  stock: "",
  defaultSupplierId: "",
};

export default function InventoryItemFormModal({
  open,
  onClose,
  initial = null, // لو null يبقى إنشاء
  onSaved, // callback بعد الحفظ بنجاح
}) {
  const [form, setForm] = useState(DEFAULT_ITEM);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    if (!open) return;
    setForm(
      initial
        ? {
            name: initial.name || "",
            sku: initial.sku || "",
            type: initial.type || "accessory",
            unitCost: initial.unitCost ?? "",
            salePrice: initial.salePrice ?? "",
            stock: initial.stock ?? "",
            defaultSupplierId:
              initial.defaultSupplierId || initial.defaultSupplier?._id || "",
          }
        : DEFAULT_ITEM
    );
    (async () => {
      try {
        const list = await SuppliersAPI.list();
        setSuppliers(list);
      } catch {
        setSuppliers([]);
      }
    })();
  }, [open, initial]);

  function setField(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/40">
      <div className="bg-white dark:bg-gray-800 w-[520px] max-w-[92vw] rounded-2xl p-4 space-y-3 shadow-xl">
        <h3 className="text-lg font-semibold">
          {initial ? "تعديل عنصر" : "إضافة عنصر للمخزن"}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="النوع">
            <select
              className="inp w-full"
              value={form.type}
              onChange={(e) => setField("type", e.target.value)}
            >
              <option value="accessory">إكسسوار</option>
              <option value="part">قطعة غيار</option>
            </select>
          </Field>
          <Field label="SKU (اختياري)">
            <input
              className="inp w-full"
              value={form.sku}
              onChange={(e) => setField("sku", e.target.value)}
              placeholder="كود داخلي/تعريفي"
            />
          </Field>
          <Field label="اسم الصنف">
            <input
              className="inp w-full"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="مثال: اسكرينة 6D / كابل Type-C / شاشة A12"
            />
          </Field>
          <Field label="المورد الافتراضي (اختياري)">
            <select
              className="inp w-full"
              value={form.defaultSupplierId}
              onChange={(e) => setField("defaultSupplierId", e.target.value)}
            >
              <option value="">— بدون —</option>
              {suppliers.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.isShop ? "المحل" : s.name}
                  {s.phone ? ` — ${s.phone}` : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="تكلفة الوحدة">
            <input
              type="number"
              className="inp w-full"
              value={form.unitCost}
              onChange={(e) => setField("unitCost", e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="سعر البيع (اختياري)">
            <input
              type="number"
              className="inp w-full"
              value={form.salePrice}
              onChange={(e) => setField("salePrice", e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="الكمية بالمخزن">
            <input
              type="number"
              className="inp w-full"
              value={form.stock}
              onChange={(e) => setField("stock", e.target.value)}
              placeholder="0"
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2">
          <button className="px-3 py-2 rounded-xl border" onClick={onClose}>
            إلغاء
          </button>
          <button
            className="px-3 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-50"
            disabled={saving}
            onClick={async () => {
              if (!form.name) {
                alert("ادخل اسم الصنف");
                return;
              }
              setSaving(true);
              try {
                const payload = {
                  name: form.name,
                  sku: form.sku || undefined,
                  type: form.type,
                  unitCost:
                    form.unitCost === "" ? 0 : Number(form.unitCost || 0),
                  salePrice:
                    form.salePrice === "" ? undefined : Number(form.salePrice),
                  stock: form.stock === "" ? 0 : Number(form.stock || 0),
                  defaultSupplierId: form.defaultSupplierId || undefined,
                };
                await onSaved?.(payload, !!initial);
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "جارٍ الحفظ..." : initial ? "حفظ التعديل" : "إضافة"}
          </button>
        </div>
      </div>
      <style>{`.inp{padding:.5rem .75rem;border-radius:.75rem;background:#f3f4f6}`}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="space-y-1">
      <div className="text-sm opacity-80">{label}</div>
      {children}
    </label>
  );
}
