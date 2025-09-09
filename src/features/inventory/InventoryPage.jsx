import { useEffect, useMemo, useState } from "react";
import API from "../../lib/api";
import SupplierSelect from "../../components/parts/SupplierSelect";

/** تصنيف موحّد */
const CATEGORIES = [
  { value: "part", label: "قطعة غيار" },
  { value: "accessory", label: "اكسسوار" },
];

/** أدوات مساعدة */
function numOrEmpty(v) {
  if (v === 0) return 0;
  if (v === "" || v == null || Number.isNaN(Number(v))) return "";
  return Number(v);
}

export default function InventoryPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState(""); // "", "part", "accessory"
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const hasFilter = useMemo(() => !!q || !!category, [q, category]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      // ⬇️ عدّل لو مسارك مختلف
      const { data } = await API.get("/inventory", {
        params: {
          ...(q ? { q } : {}),
          ...(category ? { category } : {}),
        },
      });
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.message || "تعذر تحميل الأصناف");
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category]);

  function openCreate() {
    setEditTarget(null);
    setModalOpen(true);
  }
  function openEdit(item) {
    setEditTarget(item);
    setModalOpen(true);
  }
  function askDelete(item) {
    setConfirmTarget(item);
    setConfirmOpen(true);
  }

  async function doDelete() {
    if (!confirmTarget?._id) return;
    try {
      // ⬇️ عدّل لو مسارك مختلف
      await API.delete(`/inventory/${confirmTarget._id}`);
      setList((prev) =>
        prev.filter((x) => String(x._id) !== String(confirmTarget._id))
      );
    } catch (e) {
      alert(e?.response?.data?.message || "تعذر حذف الصنف");
    } finally {
      setConfirmOpen(false);
      setConfirmTarget(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* رأس الصفحة */}
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">المخزن</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            تحديث
          </button>
          <button
            onClick={openCreate}
            className="px-3 py-2 rounded-xl bg-blue-600 text-white hover:opacity-90"
          >
            + إضافة صنف
          </button>
        </div>
      </header>

      {/* الفلاتر */}
      <section className="p-3 rounded-2xl bg-white dark:bg-gray-800 shadow-sm space-y-2">
        <div className="grid md:grid-cols-3 gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="بحث باسم/كود/ملاحظة…"
            className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 w-full"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 w-full"
          >
            <option value="">كل الأنواع</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setQ("");
              setCategory("");
            }}
            className="px-3 py-2 rounded-xl border"
            disabled={!hasFilter}
          >
            مسح الفلاتر
          </button>
        </div>
      </section>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 text-red-800">{error}</div>
      )}

      {/* الجدول */}
      <section className="p-3 rounded-2xl bg-white dark:bg-gray-800 shadow-sm overflow-x-auto">
        <div className="text-sm opacity-70 mb-2">
          النتائج: {loading ? "…" : list.length}
        </div>
        <table className="w-full text-sm border-separate [border-spacing:0]">
          <thead className="sticky top-0 bg-white dark:bg-gray-800 shadow-sm">
            <tr className="text-right">
              <Th>الاسم</Th>
              <Th>النوع</Th>
              <Th>الكود/الـSKU</Th>
              <Th>سعر التكلفة</Th>
              <Th>الكمية</Th>
              <Th>أدنى كمية</Th>
              <Th>المورد</Th>
              <Th>ملاحظات</Th>
              <Th>إجراءات</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-6 text-center opacity-70">
                  لا توجد أصناف.
                </td>
              </tr>
            ) : (
              list.map((it) => (
                <tr
                  key={it._id}
                  className={`odd:bg-gray-50 dark:odd:bg-gray-700/40 ${
                    it.minStock != null &&
                    it.stock != null &&
                    it.stock <= it.minStock
                      ? "ring-1 ring-amber-300 dark:ring-amber-700"
                      : ""
                  }`}
                >
                  <Td className="font-medium">{it.name}</Td>
                  <Td>
                    {it.category === "part"
                      ? "قطعة غيار"
                      : it.category === "accessory"
                      ? "اكسسوار"
                      : "—"}
                  </Td>
                  <Td>{it.sku || "—"}</Td>
                  <Td>
                    {typeof it.unitCost === "number"
                      ? Number(it.unitCost).toFixed(2)
                      : "—"}
                  </Td>
                  <Td>{typeof it.stock === "number" ? it.stock : "—"}</Td>
                  <Td>{typeof it.minStock === "number" ? it.minStock : "—"}</Td>
                  <Td>
                    {it.supplier?.isShop ? "المحل" : it.supplier?.name || "—"}
                  </Td>
                  <Td className="max-w-[240px] truncate" title={it.notes || ""}>
                    {it.notes || "—"}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <button
                        className="px-2 py-1 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
                        onClick={() => openEdit(it)}
                      >
                        تعديل
                      </button>
                      <button
                        className="px-2 py-1 rounded-lg bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200"
                        onClick={() => askDelete(it)}
                      >
                        حذف
                      </button>
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* مودال إنشاء/تعديل الصنف */}
      <ItemFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={editTarget}
        onSaved={(saved) => {
          setModalOpen(false);
          setEditTarget(null);
          // تحديث القائمة محليًا بدون ريلود كامل
          setList((prev) => {
            const idx = prev.findIndex(
              (x) => String(x._id) === String(saved._id)
            );
            if (idx === -1) return [saved, ...prev];
            const cp = prev.slice();
            cp[idx] = saved;
            return cp;
          });
        }}
      />

      {/* تأكيد الحذف */}
      <ConfirmDialog
        open={confirmOpen}
        title="تأكيد الحذف"
        message={
          confirmTarget
            ? `هل أنت متأكد من حذف الصنف «${confirmTarget.name}»؟`
            : "هل تريد الحذف؟"
        }
        onCancel={() => {
          setConfirmOpen(false);
          setConfirmTarget(null);
        }}
        onConfirm={doDelete}
        confirmClass="bg-red-600 text-white"
        confirmText="حذف"
      />
    </div>
  );
}

/* ============ Sub Components ============ */

function Th({ children }) {
  return (
    <th className="p-2 text-xs font-semibold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
      {children}
    </th>
  );
}
function Td({ children, className = "" }) {
  return <td className={`p-2 align-top ${className}`}>{children}</td>;
}
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i} className="p-2">
          <div className="h-3 rounded bg-gray-200 dark:bg-gray-700 w-full" />
        </td>
      ))}
    </tr>
  );
}

/** مودال إنشاء/تعديل صنف */
function ItemFormModal({ open, onClose, initial, onSaved }) {
  const isEdit = !!initial?._id;

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [sku, setSku] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [stock, setStock] = useState("");
  const [minStock, setMinStock] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setName(initial.name || "");
      setCategory(initial.category || "");
      setSku(initial.sku || "");
      setUnitCost(numOrEmpty(initial.unitCost));
      setStock(numOrEmpty(initial.stock));
      setMinStock(numOrEmpty(initial.minStock));
      setSupplierId(initial?.supplier?._id || initial?.supplierId || "");
      setNotes(initial.notes || "");
    } else {
      setName("");
      setCategory("");
      setSku("");
      setUnitCost("");
      setStock("");
      setMinStock("");
      setSupplierId("");
      setNotes("");
    }
  }, [open, isEdit, initial]);

  async function submit(e) {
    e?.preventDefault?.();
    if (!name || !category) {
      alert("الاسم والنوع مطلوبان");
      return;
    }

    const payload = {
      name,
      category, // "part" | "accessory"
      ...(sku ? { sku } : {}),
      ...(unitCost !== "" ? { unitCost: Number(unitCost) } : {}),
      ...(stock !== "" ? { stock: Number(stock) } : {}),
      ...(minStock !== "" ? { minStock: Number(minStock) } : {}),
      ...(supplierId ? { supplierId } : {}),
      ...(notes ? { notes } : {}),
    };

    try {
      setSaving(true);
      // ⬇️ عدّل لو مسارك مختلف
      const { data } = isEdit
        ? await API.put(`/inventory/${initial._id}`, payload)
        : await API.post("/inventory/", payload);

      onSaved?.(data);
    } catch (e) {
      alert(e?.response?.data?.message || "تعذر الحفظ");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40">
      <form
        onSubmit={submit}
        className="bg-white dark:bg-gray-800 w-[520px] max-w-[92vw] rounded-2xl p-4 space-y-3 shadow-xl"
      >
        <h3 className="text-lg font-semibold">
          {isEdit ? "تعديل صنف" : "إضافة صنف"}
        </h3>

        <div className="grid md:grid-cols-2 gap-3">
          <Field label="الاسم *">
            <input
              className="inp w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>

          <Field label="النوع *">
            <select
              className="inp w-full"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              <option value="">— اختر —</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="الكود / SKU">
            <input
              className="inp w-full"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="اختياري"
            />
          </Field>

          <Field label="سعر التكلفة">
            <input
              type="number"
              className="inp w-full"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              placeholder="0"
              step="0.01"
            />
          </Field>

          <Field label="الكمية">
            <input
              type="number"
              className="inp w-full"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="0"
            />
          </Field>

          <Field label="أدنى كمية">
            <input
              type="number"
              className="inp w-full"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              placeholder="0"
            />
          </Field>

          {/* <Field label="المورد">
            <SupplierSelect
              value={supplierId}
              onChange={(id) => setSupplierId(id)}
            />
          </Field> */}

          <Field label="ملاحظات">
            <input
              className="inp w-full"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="اختياري"
            />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="px-3 py-2 rounded-xl border"
            onClick={onClose}
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-3 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-50"
          >
            {saving ? "جارٍ الحفظ…" : "حفظ"}
          </button>
        </div>

        <style>{`.inp{padding:.5rem .75rem;border-radius:.75rem;background:#f3f4f6}`}</style>
      </form>
    </div>
  );
}

/** مودال تأكيد بسيط */
function ConfirmDialog({
  open,
  title = "تأكيد",
  message = "هل أنت متأكد؟",
  cancelText = "إلغاء",
  confirmText = "تأكيد",
  confirmClass = "bg-blue-600 text-white",
  onCancel,
  onConfirm,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40">
      <div className="bg-white dark:bg-gray-800 w-[420px] max-w-[92vw] rounded-2xl p-4 space-y-3 shadow-xl">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="opacity-80">{message}</p>
        <div className="flex items-center justify-end gap-2">
          <button className="px-3 py-2 rounded-xl border" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            className={`px-3 py-2 rounded-xl ${confirmClass}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/** حقل بفورم */
function Field({ label, children }) {
  return (
    <label className="space-y-1">
      <div className="text-sm opacity-80">{label}</div>
      {children}
    </label>
  );
}
