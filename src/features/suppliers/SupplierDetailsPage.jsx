import { useEffect, useMemo, useState } from "react";
import { getSupplier, listSupplierParts } from "../../lib/suppliersApi";
import { Link, useParams } from "react-router-dom";
import formatDate from "../../utils/formatDate";

function ymdLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function SupplierDetailsPage() {
  const { id } = useParams();
  const [supplier, setSupplier] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = useMemo(() => ymdLocal(new Date()), []);
  const yesterday = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return ymdLocal(d);
  }, []);
  const [quick, setQuick] = useState("today");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  async function load() {
    setLoading(true);
    try {
      const [s, list] = await Promise.all([
        getSupplier(id),
        listSupplierParts(id, {
          startDate: quick === "all" ? "" : startDate,
          endDate: quick === "all" ? "" : endDate,
        }),
      ]);
      setSupplier(s);
      setRows(list);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
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

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">
          مورد: {supplier?.isShop ? "المحل" : supplier?.name || ""}
        </h1>
        <Link
          to="/suppliers"
          className="px-3 py-2 rounded-xl bg-gray-200 dark:bg-gray-700"
        >
          رجوع
        </Link>
      </header>

      {/* فلاتر */}
      <section className="p-3 rounded-2xl bg-white dark:bg-gray-800 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => applyQuick("today")}
            className={`px-3 py-2 rounded-xl border ${
              quick === "today" ? "bg-blue-600 text-white border-blue-600" : ""
            }`}
          >
            اليوم
          </button>
          <button
            onClick={() => applyQuick("yesterday")}
            className={`px-3 py-2 rounded-xl border ${
              quick === "yesterday"
                ? "bg-blue-600 text-white border-blue-600"
                : ""
            }`}
          >
            أمس
          </button>
          <button
            onClick={() => applyQuick("all")}
            className={`px-3 py-2 rounded-xl border ${
              quick === "all" ? "bg-blue-600 text-white border-blue-600" : ""
            }`}
          >
            كل الوقت
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setQuick("custom");
            }}
            className="inp"
          />
          <span className="opacity-60 hidden sm:inline">—</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setQuick("custom");
            }}
            className="inp"
          />
          <button
            onClick={load}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white"
          >
            تطبيق
          </button>
        </div>
      </section>

      {/* جدول */}
      <section className="p-3 rounded-2xl bg-white dark:bg-gray-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-right">
              <Th>اسم القطعة</Th>
              <Th>صنف المخزن</Th>
              <Th>اُستخدمت في</Th>
              <Th>الفني/المُدخل</Th>
              <Th>التكلفة</Th>
              <Th>تاريخ الشراء/الإدخال</Th>
              <Th>تم الدفع؟</Th>
              <Th>فتح الصيانة</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="p-3 opacity-70">
                  جارٍ التحميل…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-3 opacity-70">
                  لا يوجد بيانات ضمن المدى
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
                    #{r.repairNumber} — {r.deviceType || ""}
                  </Td>
                  <Td>{r.byName || "—"}</Td>
                  <Td>{typeof r.cost === "number" ? r.cost : "—"}</Td>
                  <Td>{r.purchaseDate ? formatDate(r.purchaseDate) : "—"}</Td>
                  <Td>{r.paid ? "نعم" : "لا"}</Td>
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
