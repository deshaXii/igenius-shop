import { useEffect, useMemo, useState } from "react";
import API from "../../lib/api";
import SupplierSelect from "../../components/parts/SupplierSelect";
import { listSuppliers } from "../../lib/suppliersApi";

/** تصنيف موحّد */
const CATEGORIES = [
  { value: "part", label: "قطعة غيار" },
  { value: "accessory", label: "اكسسوار" },
];

/** لوحة ألوان/ستايلات مختصرة */
const UI = {
  card: "bg-white dark:bg-[#1c273fe6] border border-slate-200 dark:border-slate-800 rounded-2xl",
  subtle: "bg-slate-50 dark:bg-slate-800/60",
  btn: "px-3 py-2 rounded-xl transition focus:outline-none focus:ring-2 focus:ring-indigo-500",
  btnPrimary: "bg-indigo-600 hover:bg-indigo-700 text-white",
  btnGhost:
    "border border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800",
  badge: "px-2 py-0.5 text-xs rounded-full",
  input: "px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 w-full",
};

function categoryLabel(v) {
  return v === "part" ? "قطعة غيار" : v === "accessory" ? "اكسسوار" : "—";
}

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
  const [supplierId, setSupplierId] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const suppliersData = await listSuppliers();
      suppliersData
        .filter((s) => s.isShop)
        .map((item) => {
          setSupplierId(item._id);
        });
      const { data } = await API.get("/inventory", {
        params: { ...(q ? { q } : {}), ...(category ? { category } : {}) },
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
    <div className="space-y-5">
      {/* ===== رأس الصفحة (جريدينت خفيف) ===== */}
      <div className="rounded-3xl overflow-hidden">
        <div className="bg-gradient-to-l from-fuchsia-600 via-violet-600 to-indigo-700 text-white p-5 md:p-7">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">المخزن</h1>
              <p className="opacity-90">
                إدارة الأصناف، تتبّع الكميات، وتنبيه انخفاض المخزون.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={load}
                className={`${UI.btn} bg-white/90 text-indigo-700 hover:opacity-90`}
              >
                تحديث
              </button>
              <button
                onClick={openCreate}
                className={`${UI.btn} bg-white/90 text-indigo-700 hover:opacity-90`}
              >
                + إضافة صنف
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== الفلاتر ===== */}
      <section className={`${UI.card} p-3 md:p-4 space-y-3`}>
        <div className="grid md:grid-cols-3 gap-2">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder="بحث باسم/كود/ملاحظة…"
              className={`${UI.input} pl-9`}
            />
            <svg
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-60"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M21 21l-4.35-4.35m1.1-5.4a6.75 6.75 0 11-13.5 0 6.75 6.75 0 0113.5 0z" />
            </svg>
          </div>

          <div className="flex gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={`${UI.input}`}
            >
              <option value="">كل الأنواع</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setQ("");
                setCategory("");
              }}
              className={`${UI.btn} ${UI.btnGhost} w-full md:w-auto`}
              disabled={!hasFilter}
            >
              مسح الفلاتر
            </button>
          </div>
        </div>

        <div className="text-sm opacity-70">
          النتائج: {loading ? "…" : list.length}
        </div>
      </section>

      {error && (
        <div className="p-3 rounded-2xl bg-red-50 text-red-800">{error}</div>
      )}

      {/* ===== القائمة ===== */}
      <section className={`${UI.card} p-0 overflow-hidden`}>
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm border-separate [border-spacing:0]">
            <thead className="sticky top-0 bg-white/95 dark:bg-gray-900/95 shadow-sm">
              <tr className="text-right">
                <Th>الاسم</Th>
                <Th>النوع</Th>
                <Th>الكود/الـSKU</Th>
                <Th>سعر التكلفة</Th>
                <Th>الكمية</Th>
                <Th>أدنى كمية</Th>
                {/* <Th>المورد</Th> */}
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
                list.map((it) => {
                  const low =
                    it.minStock != null &&
                    it.stock != null &&
                    it.stock <= it.minStock;
                  return (
                    <tr
                      key={it._id}
                      className={`odd:bg-slate-50 dark:odd:bg-slate-800/50 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition ${
                        low ? "ring-1 ring-amber-300 dark:ring-amber-700" : ""
                      }`}
                    >
                      <Td className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>{it.name}</span>
                          {low && (
                            <span
                              className={`${UI.badge} bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200`}
                            >
                              منخفض
                            </span>
                          )}
                        </div>
                      </Td>
                      <Td>{categoryLabel(it.category)}</Td>
                      <Td>{it.sku || "—"}</Td>
                      <Td>
                        {typeof it.unitCost === "number"
                          ? Number(it.unitCost).toFixed(2)
                          : "—"}
                      </Td>
                      <Td>{typeof it.stock === "number" ? it.stock : "—"}</Td>
                      <Td>
                        {typeof it.minStock === "number" ? it.minStock : "—"}
                      </Td>
                      {/* <Td>
                        {it.supplier?.isShop
                          ? "المحل"
                          : it.supplier?.name || "—"}
                      </Td> */}
                      <Td
                        className="max-w-[260px] truncate"
                        title={it.notes || ""}
                      >
                        {it.notes || "—"}
                      </Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <button
                            className={`${UI.btn} ${UI.btnGhost}`}
                            onClick={() => openEdit(it)}
                          >
                            تعديل
                          </button>
                          <button
                            className={`${UI.btn} bg-rose-600 hover:bg-rose-700 text-white`}
                            onClick={() => askDelete(it)}
                          >
                            حذف
                          </button>
                        </div>
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden p-3 grid gap-3">
          {loading ? (
            <>
              <CardSkeleton />
              <CardSkeleton />
            </>
          ) : list.length === 0 ? (
            <div className="opacity-70 text-center py-6">لا توجد أصناف.</div>
          ) : (
            list.map((it) => {
              const low =
                it.minStock != null &&
                it.stock != null &&
                it.stock <= it.minStock;
              return (
                <div
                  key={it._id}
                  className={`p-4 ${UI.subtle} rounded-2xl border dark:border-slate-700`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-base">{it.name}</div>
                      <div className="text-xs opacity-70 mt-0.5">
                        {categoryLabel(it.category)}
                      </div>
                    </div>
                    {low && (
                      <span
                        className={`${UI.badge} bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200`}
                      >
                        مخزون منخفض
                      </span>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <InfoRow k="SKU" v={it.sku || "—"} />
                    <InfoRow
                      k="سعر التكلفة"
                      v={
                        typeof it.unitCost === "number"
                          ? Number(it.unitCost).toFixed(2)
                          : "—"
                      }
                    />
                    <InfoRow
                      k="الكمية"
                      v={typeof it.stock === "number" ? it.stock : "—"}
                    />
                    <InfoRow
                      k="أدنى كمية"
                      v={typeof it.minStock === "number" ? it.minStock : "—"}
                    />
                    <InfoRow
                      k="المورد"
                      v={
                        it.supplier?.isShop ? "المحل" : it.supplier?.name || "—"
                      }
                      className="col-span-2"
                    />
                    {it.notes && (
                      <InfoRow
                        k="ملاحظات"
                        v={it.notes}
                        className="col-span-2"
                      />
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      className={`${UI.btn} ${UI.btnGhost}`}
                      onClick={() => openEdit(it)}
                    >
                      تعديل
                    </button>
                    <button
                      className={`${UI.btn} ${UI.btnPrimary}`}
                      onClick={() => askDelete(it)}
                    >
                      حذف
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* مودال إنشاء/تعديل الصنف */}
      <ItemFormModal
        open={modalOpen}
        supplierId={supplierId}
        onClose={() => setModalOpen(false)}
        initial={editTarget}
        onSaved={(saved) => {
          setModalOpen(false);
          setEditTarget(null);
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
        confirmClass="bg-rose-600 hover:bg-rose-700 text-white"
        confirmText="حذف"
      />
    </div>
  );
}

/* ============ Sub Components ============ */

function Th({ children }) {
  return (
    <th className="p-3 text-xs font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
      {children}
    </th>
  );
}
function Td({ children, className = "" }) {
  return <td className={`p-3 align-top ${className}`}>{children}</td>;
}
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i} className="p-3">
          <div className="h-3 rounded bg-slate-200 dark:bg-slate-700 w-full" />
        </td>
      ))}
    </tr>
  );
}
function CardSkeleton() {
  return (
    <div
      className={`p-4 ${UI.subtle} rounded-2xl border dark:border-slate-700 animate-pulse`}
    >
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
      <div className="grid grid-cols-2 gap-2 mt-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-3 bg-slate-200 dark:bg-slate-700 rounded" />
        ))}
      </div>
    </div>
  );
}
function InfoRow({ k, v, className = "" }) {
  return (
    <div className={`text-sm ${className}`}>
      <div className="text-[11px] opacity-60">{k}</div>
      <div className="font-medium break-words">{v}</div>
    </div>
  );
}

/** مودال إنشاء/تعديل صنف */
function ItemFormModal({ open, onClose, initial, onSaved, supplierId }) {
  const isEdit = !!initial?._id;

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [sku, setSku] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [stock, setStock] = useState("");
  const [minStock, setMinStock] = useState("");
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
      setNotes(initial.notes || "");
    } else {
      setName("");
      setCategory("");
      setSku("");
      setUnitCost("");
      setStock("");
      setMinStock("");
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
        className={`${UI.card} w-[560px] max-w-[92vw] overflow-y-auto h-[86vh] md:h-auto p-4 md:p-5 shadow-xl`}
      >
        <h3 className="text-lg font-semibold">
          {isEdit ? "تعديل صنف" : "إضافة صنف"}
        </h3>

        <div className="mt-3 grid md:grid-cols-2 gap-3">
          <Field label="الاسم *">
            <input
              className={UI.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>

          <Field label="النوع *">
            <select
              className={UI.input}
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
              className={UI.input}
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="اختياري"
            />
          </Field>

          <Field label="سعر التكلفة">
            <input
              type="number"
              className={UI.input}
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              placeholder="0"
              step="0.01"
            />
          </Field>

          <Field label="الكمية">
            <input
              type="number"
              className={UI.input}
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="0"
            />
          </Field>

          <Field label="أدنى كمية">
            <input
              type="number"
              className={UI.input}
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              placeholder="0"
            />
          </Field>

          <Field label="ملاحظات">
            <input
              className={UI.input}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="اختياري"
            />
          </Field>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            className={`${UI.btn} ${UI.btnGhost}`}
            onClick={onClose}
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={saving}
            className={`${UI.btn} ${UI.btnPrimary} disabled:opacity-50`}
          >
            {saving ? "جارٍ الحفظ…" : "حفظ"}
          </button>
        </div>
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
  confirmClass = "bg-indigo-600 text-white",
  onCancel,
  onConfirm,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40">
      <div className={`${UI.card} w-[420px] max-w-[92vw] p-4 md:p-5 shadow-xl`}>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="opacity-80 mt-1">{message}</p>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button className={`${UI.btn} ${UI.btnGhost}`} onClick={onCancel}>
            {cancelText}
          </button>
          <button className={`${UI.btn} ${confirmClass}`} onClick={onConfirm}>
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
