import { useEffect, useMemo, useState } from "react";
import { createSupplier, listSuppliers } from "../../lib/suppliersApi";
import { Link } from "react-router-dom";
import useAuthStore from "../auth/authStore";

/* UI presets موحّدة */
const UI = {
  card: "bg-white/90 dark:bg-zinc-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl",
  input:
    "px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500",
  btn: "px-3 py-2 rounded-xl transition focus:outline-none focus:ring-2 focus:ring-indigo-500",
  btnPrimary: "bg-indigo-600 hover:bg-indigo-700 text-white",
  btnGhost:
    "border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800",
  pill: "px-2 py-0.5 rounded-full text-xs font-medium",
};

export default function SuppliersPage() {
  const { user } = useAuthStore();
  const canManage = user?.role === "admin" || user?.permissions?.adminOverride;

  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ name: "", phone: "" });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return list;
    return list.filter(
      (s) =>
        (s.name || "").toLowerCase().includes(t) || (s.phone || "").includes(t)
    );
  }, [list, q]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await listSuppliers();
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.message || "تعذّر تحميل الموردين");
      setList([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function add(e) {
    e.preventDefault();
    if (!canManage) return alert("ليست لديك صلاحيات إضافة مورد");
    const name = form.name.trim();
    const phone = form.phone.trim();
    if (!name) return;
    try {
      setSaving(true);
      await createSupplier({ name, phone });
      setForm({ name: "", phone: "" });
      await load();
    } catch (e) {
      alert(e?.response?.data?.message || "تعذّر إضافة المورد");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSupplier(id) {
    if (!canManage) return alert("ليست لديك صلاحيات حذف مورد");
    if (!id) return;
    if (!window.confirm("هل أنت متأكد من حذف هذا المورد؟")) return;
    try {
      setSaving(true);
      await fetch(`http://localhost:5000/api/suppliers/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      await load();
    } catch (e) {
      alert(e?.response?.data?.message || "تعذّر حذف المورد");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* هيدر أنيق */}
      <div className="rounded-3xl overflow-hidden">
        <div className="bg-gradient-to-l from-fuchsia-600 via-violet-600 to-indigo-700 text-white p-5 md:p-7">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">الموردون</h1>
              <p className="opacity-90">إدارة الموردين والبحث بسرعة.</p>
            </div>
            <div className="text-sm opacity-90">
              الإجمالي: {loading ? "…" : list.length}
            </div>
          </div>
        </div>
      </div>

      {/* بحث + إضافة */}
      <section
        className={`${UI.card} p-3 md:p-4 shadow-sm grid md:grid-cols-3 gap-2`}
      >
        <div className="flex gap-2">
          <input
            className={UI.input}
            placeholder="بحث بالاسم/الهاتف"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            aria-label="بحث الموردين"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className={`${UI.btn} ${UI.btnGhost}`}
              aria-label="مسح البحث"
              title="مسح"
            >
              مسح
            </button>
          )}
        </div>

        {canManage && (
          <form
            onSubmit={add}
            className="md:col-span-2 grid sm:grid-cols-3 gap-2"
          >
            <input
              className={UI.input}
              placeholder="اسم المورد *"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className={UI.input}
              placeholder="هاتف (اختياري)"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <button
              className={`${UI.btn} ${UI.btnPrimary} disabled:opacity-50`}
              disabled={saving}
            >
              {saving ? "جارٍ الإضافة…" : "إضافة مورد"}
            </button>
          </form>
        )}
      </section>

      {error && (
        <div className="p-3 rounded-2xl bg-rose-50 text-rose-800">{error}</div>
      )}

      {/* ديسكتوب: جدول */}
      <section
        className={`${UI.card} p-0 shadow-sm overflow-hidden hidden md:block`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-separate [border-spacing:0]">
            <thead className="sticky top-0 bg-white/95 dark:bg-zinc-900/95 shadow-sm">
              <tr className="text-right">
                <Th>الاسم</Th>
                <Th>الهاتف</Th>
                <Th>النوع</Th>
                <Th>اجراءات</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center opacity-70">
                    لا توجد نتائج مطابقة.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr
                    key={s._id}
                    className="odd:bg-slate-50 dark:odd:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition"
                  >
                    <Td className="font-medium">
                      {s.isShop ? "المحل" : s.name}
                    </Td>
                    <Td>
                      {s.phone ? (
                        <a
                          href={`tel:${s.phone}`}
                          className="text-indigo-600 hover:underline"
                        >
                          {s.phone}
                        </a>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td>
                      <span
                        className={`${UI.pill} ${
                          s.isShop
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
                            : "bg-slate-100 text-slate-800 dark:bg-slate-700"
                        }`}
                      >
                        {s.isShop ? "داخلي" : "خارجي"}
                      </span>
                    </Td>
                    <Td>
                      {/* <Link
                        to={`/suppliers/${s._id}`}
                        className={`${UI.btn} ${UI.btnGhost}  inline-block`}
                      >
                        فتح
                      </Link> */}
                      {!s.isShop && (
                        <button
                          onClick={() => deleteSupplier(s._id)}
                          className={`${UI.btn} ${UI.btnGhost} mx-2 inline-block`}
                        >
                          حذف
                        </button>
                      )}
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* موبايل: بطاقات */}
      <section className="md:hidden space-y-2">
        {loading ? (
          <div className={`${UI.card} p-4 animate-pulse h-24`} />
        ) : filtered.length === 0 ? (
          <div className={`${UI.card} p-6 text-center`}>
            <div className="text-3xl mb-2">🔍</div>
            <div className="opacity-70">لا توجد نتائج مطابقة.</div>
          </div>
        ) : (
          filtered.map((s) => (
            <div key={s._id} className={`${UI.card} p-3 shadow-sm`}>
              <div className="flex items-center justify-between">
                <div className="font-semibold">
                  {s.isShop ? "المحل" : s.name}
                </div>
                <span
                  className={`${UI.pill} ${
                    s.isShop
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
                      : "bg-slate-100 text-slate-800 dark:bg-slate-700"
                  }`}
                >
                  {s.isShop ? "داخلي" : "خارجي"}
                </span>
              </div>
              <div className="text-sm opacity-80 mt-1">
                الهاتف:{" "}
                {s.phone ? (
                  <a
                    href={`tel:${s.phone}`}
                    className="text-indigo-600 hover:underline"
                  >
                    {s.phone}
                  </a>
                ) : (
                  "—"
                )}
              </div>
              <div className="mt-3">
                <Link
                  to={`/suppliers/${s._id}`}
                  className={`${UI.btn} ${UI.btnGhost}`}
                >
                  فتح
                </Link>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

/* ===== Sub Components ===== */
function Th({ children }) {
  return (
    <th className="p-3 text-xs font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
      {children}
    </th>
  );
}
function Td({ children, className = "" }) {
  return <td className={`p-2 align-middle ${className}`}>{children}</td>;
}
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <td key={i} className="p-3">
          <div className="h-3 rounded bg-slate-200 dark:bg-slate-700 w-full" />
        </td>
      ))}
    </tr>
  );
}
