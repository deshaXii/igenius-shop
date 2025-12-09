import { useEffect, useMemo, useState } from "react";
import { getSupplier, listSupplierParts } from "../../lib/suppliersApi";
import { Link, useParams } from "react-router-dom";
import formatDate from "../../utils/formatDate";

/* ====== Helpers ====== */
function ymdLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function sum(arr, sel = (x) => x) {
  return arr.reduce((a, b) => a + (Number(sel(b)) || 0), 0);
}
function cls(...xs) {
  return xs.filter(Boolean).join(" ");
}

/* ====== Page ====== */
export default function SupplierDetailsPage() {
  const { id } = useParams();
  const [supplier, setSupplier] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const today = useMemo(() => ymdLocal(new Date()), []);
  const yesterday = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return ymdLocal(d);
  }, []);
  const [quick, setQuick] = useState("today"); // today | yesterday | all | custom
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [s, list] = await Promise.all([
        getSupplier(id),
        listSupplierParts(id, {
          startDate: quick === "all" ? "" : startDate,
          endDate: quick === "all" ? "" : endDate,
        }),
      ]);
      setSupplier(s);
      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e?.response?.data?.message || "تعذّر تحميل بيانات المورد");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, quick, startDate, endDate]);

  function applyQuick(v) {
    setQuick(v);
    if (v === "today") {
      setStartDate(today);
      setEndDate(today);
    } else if (v === "yesterday") {
      setStartDate(yesterday);
      setEndDate(yesterday);
    } else if (v === "all") {
      setStartDate("");
      setEndDate("");
    }
  }

  // ====== Totals ======
  const totalCount = rows.length;
  const totalCost = sum(rows, (r) => r?.cost);
  const paidCount = rows.filter((r) => !!r.paid).length;
  const paidAmount = sum(
    rows.filter((r) => r.paid),
    (r) => r.cost
  );
  const unpaidCount = totalCount - paidCount;
  const unpaidAmount = totalCost - paidAmount;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <span>المورد:</span>
          <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700">
            {supplier?.isShop ? "المحل" : supplier?.name || "—"}
          </span>
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            تحديث
          </button>
          <Link
            to="/suppliers"
            className="px-3 py-2 rounded-xl bg-gray-200 dark:bg-gray-700"
          >
            رجوع
          </Link>
        </div>
      </header>

      {/* Filters */}
      <section className="p-3 rounded-2xl bg-white dark:bg-gray-800 shadow-sm space-y-3 sticky top-0 z-10">
        <div className="flex flex-wrap gap-2">
          <QuickBtn
            label="اليوم"
            active={quick === "today"}
            onClick={() => applyQuick("today")}
          />
          <QuickBtn
            label="أمس"
            active={quick === "yesterday"}
            onClick={() => applyQuick("yesterday")}
          />
          <QuickBtn
            label="كل الوقت"
            active={quick === "all"}
            onClick={() => applyQuick("all")}
          />
          <span className="hidden sm:inline opacity-60 self-center">أو</span>
          <div className="flex flex-1 min-w-[240px] items-center gap-2 date-filter">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setQuick("custom");
              }}
              className="inp w-full"
              aria-label="تاريخ البداية"
            />
            <span className="opacity-60 hidden sm:inline">—</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setQuick("custom");
              }}
              className="inp w-full"
              aria-label="تاريخ النهاية"
            />
            <button
              onClick={load}
              className="px-3 py-2 rounded-xl bg-blue-600 text-white"
            >
              تطبيق
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid md:grid-cols-4 gap-2 text-sm">
          <Stat label="عدد القطع" value={totalCount} />
          <Stat label="إجمالي التكلفة" value={fmtMoney(totalCost)} />
          <Stat
            label="مدفوع"
            value={
              <>
                {fmtMoney(paidAmount)}{" "}
                <span className="opacity-70">({paidCount})</span>
              </>
            }
            tone="success"
          />
          <Stat
            label="غير مدفوع"
            value={
              <>
                {fmtMoney(unpaidAmount)}{" "}
                <span className="opacity-70">({unpaidCount})</span>
              </>
            }
            tone="warn"
          />
        </div>
      </section>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 text-red-800">{error}</div>
      )}

      {/* Mobile list (cards) */}
      <section className="md:hidden space-y-2">
        {loading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : rows.length === 0 ? (
          <EmptyState />
        ) : (
          rows.map((r) => (
            <article
              key={`${r.repairId}-${r.index}`}
              className="p-3 rounded-2xl bg-white dark:bg-gray-800 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-base">
                    {r.partName || "—"}
                  </div>
                  <div className="text-xs opacity-70">
                    صنف المخزن: {r.itemName || "—"}
                  </div>
                </div>
                <PaidBadge paid={!!r.paid} />
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                <Info label="صيانة">
                  #{r.repairNumber} — {r.deviceType || "—"}
                </Info>
                <Info label="الفني/المُدخل" value={r.byName || "—"} />
                <Info label="التكلفة" value={fmtMoney(r.cost)} />
                <Info
                  label="التاريخ"
                  value={r.purchaseDate ? formatDate(r.purchaseDate) : "—"}
                />
              </div>

              <div className="mt-3 flex items-center justify-end">
                <Link
                  to={`/repairs/${r.repairId}`}
                  className="px-3 py-1.5 rounded-xl bg-gray-200 dark:bg-gray-700"
                >
                  فتح الصيانة
                </Link>
              </div>
            </article>
          ))
        )}
      </section>

      {/* Desktop table */}
      <section className="hidden md:block p-3 rounded-2xl bg-white dark:bg-gray-800 shadow-sm overflow-x-auto">
        <div className="text-sm text-[16px] opacity-70 mb-2">
          النتائج: {loading ? "…" : rows.length}
        </div>
        <table className="w-full text-sm text-[16px] border-separate [border-spacing:0]">
          <thead className="sticky top-[72px] bg-white dark:bg-gray-800 shadow-sm">
            <tr className="text-right">
              <Th>اسم القطعة</Th>
              <Th>صنف المخزن</Th>
              <Th>اُستخدمت في</Th>
              <Th>الفني/المُدخل</Th>
              <Th>التكلفة</Th>
              <Th>التاريخ</Th>
              <Th>الدفع</Th>
              <Th>فتح</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <>
                <RowSkeleton />
                <RowSkeleton />
              </>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6">
                  <EmptyState />
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={`${r.repairId}-${r.index}`}
                  className="odd:bg-gray-50 dark:odd:bg-gray-700/40"
                >
                  <Td className="font-medium">{r.partName || "—"}</Td>
                  <Td>{r.itemName || "—"}</Td>
                  <Td>
                    #{r.repairNumber} — {r.deviceType || "—"}
                  </Td>
                  <Td>{r.byName || "—"}</Td>
                  <Td>{fmtMoney(r.cost)}</Td>
                  <Td>{r.purchaseDate ? formatDate(r.purchaseDate) : "—"}</Td>
                  <Td>
                    <PaidBadge paid={!!r.paid} />
                  </Td>
                  <Td>
                    <Link
                      to={`/repairs/${r.repairId}`}
                      className="px-2 py-1 rounded-lg bg-gray-200 dark:bg-gray-700"
                    >
                      فتح
                    </Link>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <style>{`.inp{padding:.5rem .75rem;border-radius:.75rem;background:var(--inp-bg,#f3f4f6);}`}</style>
    </div>
  );
}

/* ====== Small components ====== */
function QuickBtn({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cls(
        "px-3 py-2 rounded-xl border transition",
        active
          ? "bg-blue-600 text-white border-blue-600"
          : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
      )}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}
function Stat({ label, value, tone }) {
  const toneCls =
    tone === "success"
      ? "bg-emerald-50 dark:bg-emerald-900/10"
      : tone === "warn"
      ? "bg-amber-50 dark:bg-amber-900/10"
      : "bg-gray-50 dark:bg-gray-700/40";
  return (
    <div className={cls("p-2 rounded-xl", toneCls)}>
      <div className="text-[11px] opacity-70">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
function Info({ label, value, children }) {
  const v = value ?? children ?? "—";
  return (
    <div className="p-2 rounded-xl bg-gray-50 dark:bg-gray-700/40">
      <div className="text-[11px] opacity-70">{label}</div>
      <div className="font-medium break-words">{v}</div>
    </div>
  );
}
function PaidBadge({ paid }) {
  return (
    <span
      className={cls(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold",
        paid
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
          : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
      )}
      title={paid ? "مدفوع" : "غير مدفوع"}
    >
      <svg
        viewBox="0 0 24 24"
        className="w-3 h-3"
        fill="currentColor"
        aria-hidden="true"
      >
        {paid ? (
          <path d="M9 16.2l-3.5-3.6L4 14.1 9 19l11-11-1.5-1.5z" />
        ) : (
          <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm5 11H7v-2h10v2z" />
        )}
      </svg>
      {paid ? "مدفوع" : "غير مدفوع"}
    </span>
  );
}
function Th({ children }) {
  return (
    <th className="p-2 text-xs font-semibold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
      {children}
    </th>
  );
}
function Td({ children, className = "" }) {
  return <td className={cls("p-2 align-top", className)}>{children}</td>;
}
function EmptyState() {
  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 text-center">
      <div className="text-3xl mb-2">🔍</div>
      <div className="font-semibold mb-1">لا يوجد بيانات ضمن المدى</div>
      <div className="opacity-70 text-sm">جرّب تغيير المدى الزمني بالأعلى.</div>
    </div>
  );
}
function RowSkeleton() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="p-2">
          <div className="h-3 rounded bg-gray-200 dark:bg-gray-700 w-full" />
        </td>
      ))}
    </tr>
  );
}
function CardSkeleton() {
  return (
    <div className="p-3 rounded-2xl bg-white dark:bg-gray-800 shadow-sm animate-pulse">
      <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
      <div className="h-3 w-1/4 bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  );
}
function fmtMoney(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(2);
}
