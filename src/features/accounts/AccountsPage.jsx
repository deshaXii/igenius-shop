// src/features/accounts/AccountsPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import API from "../../lib/api";
import formatDate from "../../utils/formatDate";

/* ================= Helpers ================= */
function ymdLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function egp(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return `ج.م ${num.toLocaleString("ar-EG", { maximumFractionDigits: 0 })}`;
}
function cls(...a) {
  return a.filter(Boolean).join(" ");
}

/* Skeleton بسيط */
function Skel({ className = "" }) {
  return (
    <div
      className={cls(
        "h-4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse",
        className
      )}
    />
  );
}
function Spinner({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cls("w-4 h-4 animate-spin", className)}
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      ></path>
    </svg>
  );
}

/* ================= Page ================= */
export default function AccountsPage() {
  // استبدال refetch -> load
  useEffect(() => {
    const h = () => load();
    window.addEventListener("repairs:refresh", h);
    return () => window.removeEventListener("repairs:refresh", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = useMemo(() => ymdLocal(new Date()), []);
  const yesterday = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return ymdLocal(d);
  }, []);

  const [quick, setQuick] = useState("today");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // خريطة أسماء الفنيين: id => name
  const [techMap, setTechMap] = useState({});
  // ملخّص جاهز للعرض
  const [summary, setSummary] = useState({
    totals: {},
    perTechnician: [],
    transactions: [],
  });
  // آخر استجابة خام لإعادة التطبيع لما أسماء الفنيين توصل
  const lastRawRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const techs = await API.get("/technicians").then((r) => r.data || []);
        const map = {};
        techs.forEach((t) => (map[t._id] = t.name || t.username || "—"));
        setTechMap(map);
      } catch {
        setTechMap({});
      }
    })();
  }, []);

  function normalizeApi(data, techMapArg) {
    const sum = data?.summary || {};
    const txs = data?.txs || [];

    const totals = {
      grossRevenue: Number(sum.grossRevenue || 0),
      partsCost: Number(sum.partsCost || 0),
      transactionsIn: Number(sum.transactionsIn || 0),
      transactionsOut: Number(sum.transactionsOut || 0),
      netCash: Number(sum.net || 0),
    };

    const perTechnician = (sum.perTechnician || []).map((t) => {
      const id = String(t?.technician?._id ?? t?.technician ?? t?.techId ?? "");
      const nameFromMap = id && techMapArg ? techMapArg[id] : "";
      const nameFallback = t?.techName || t?.technician?.name || "";
      const deliveredCount =
        typeof t?.deliveredCount === "number"
          ? t.deliveredCount
          : typeof t?.count === "number"
          ? t.count
          : "—";

      return {
        techId: id || "—",
        techName: nameFromMap || nameFallback || "—",
        deliveredCount,
        netProfit: Number(
          typeof t?.netProfit === "number" ? t.netProfit : t?.profit || 0
        ),
        techShare: Number(t?.techShare || 0),
        shopShare: Number(t?.shopShare || 0),
      };
    });

    return { totals, perTechnician, transactions: txs };
  }

  function applyQuick(k) {
    setQuick(k);
    if (k === "today") {
      setStartDate(today);
      setEndDate(today);
    } else if (k === "yesterday") {
      setStartDate(yesterday);
      setEndDate(yesterday);
    } else if (k === "all") {
      setStartDate("");
      setEndDate("");
    }
  }

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const params = {};
      if (quick !== "all") {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }
      const { data } = await API.get("/accounts/summary", { params });
      lastRawRef.current = data;
      setSummary(normalizeApi(data, techMap));
    } catch (e) {
      setErr(e?.response?.data?.message || "تعذر تحميل ملخص الحسابات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quick, startDate, endDate]);

  useEffect(() => {
    if (lastRawRef.current) {
      setSummary(normalizeApi(lastRawRef.current, techMap));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [techMap]);

  const netPositive = Number(summary?.totals?.netCash || 0) >= 0;

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">الحسابات</h1>
        <button
          onClick={load}
          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 inline-flex items-center gap-2"
        >
          <Spinner className={loading ? "" : "hidden"} />
          <span>تحديث</span>
        </button>
      </header>

      {/* فلاتر (Sticky على الموبايل) */}
      <section className="p-3 rounded-2xl bg-white dark:bg-gray-800 shadow-sm space-y-2 sticky top-0 z-10">
        <div className="flex flex-wrap gap-2">
          <Btn
            label="اليوم"
            active={quick === "today"}
            onClick={() => applyQuick("today")}
          />
          <Btn
            label="أمس"
            active={quick === "yesterday"}
            onClick={() => applyQuick("yesterday")}
          />
          <Btn
            label="كل الأوقات"
            active={quick === "all"}
            onClick={() => applyQuick("all")}
          />

          <span className="opacity-60 self-center hidden sm:inline">أو</span>

          <label className="sr-only" htmlFor="startDate">
            من تاريخ
          </label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setQuick("custom");
            }}
            className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700"
          />
          <label className="sr-only" htmlFor="endDate">
            إلى تاريخ
          </label>
          <input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setQuick("custom");
            }}
            className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700"
          />

          <button
            onClick={load}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white"
          >
            تطبيق
          </button>
        </div>
        {err && (
          <div className="p-3 rounded-xl bg-red-50 text-red-800">{err}</div>
        )}
      </section>

      {/* ملخص عام — بطاقات جميلة */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title="إجمالي الدخل (المُسلّم)"
          value={summary.totals?.grossRevenue || 0}
        />
        <KpiCard
          title="إجمالي قطع الغيار"
          value={summary.totals?.partsCost || 0}
        />
        <KpiCard
          title="إجمالي الداخل"
          value={summary.totals?.transactionsIn || 0}
        />
        <KpiCard
          title="إجمالي الخارج"
          value={summary.totals?.transactionsOut || 0}
        />
        <KpiCard
          className="lg:col-span-4"
          title="الصافي"
          value={summary.totals?.netCash || 0}
          highlight
          positive={netPositive}
        />
      </section>

      {/* ربح كل فني — Cards على الموبايل + جدول على الشاشات الكبيرة */}
      <section className="p-3 rounded-2xl bg-white dark:bg-gray-800 shadow-sm">
        <h2 className="font-semibold mb-3">ربح كل فني</h2>

        {/* Cards (mobile) */}
        <div className="grid gap-2 sm:hidden">
          {loading && (
            <>
              <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                <Skel className="w-32" />
                <Skel className="w-20 mt-2" />
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Skel />
                  <Skel />
                  <Skel />
                  <Skel />
                </div>
              </div>
              <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                <Skel className="w-28" />
                <Skel className="w-24 mt-2" />
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Skel />
                  <Skel />
                  <Skel />
                  <Skel />
                </div>
              </div>
            </>
          )}

          {!loading && !summary.perTechnician?.length && (
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 text-center opacity-70">
              لا بيانات
            </div>
          )}

          {!loading &&
            summary.perTechnician?.map((t, i) => (
              <article
                key={i}
                className="p-3 rounded-xl border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold">
                    {techMap[t.techId] || t.techName || "—"}
                  </div>
                  <span className="text-xs opacity-70">
                    # {t.deliveredCount ?? "—"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                  <KV k="صافي الربح" v={egp(Math.round(t.netProfit))} />
                  <KV k="نصيب الفني" v={egp(Math.round(t.techShare))} />
                  <KV k="نصيب المحل" v={egp(Math.round(t.shopShare))} />
                </div>
              </article>
            ))}
        </div>

        {/* Table (desktop) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right">
                <Th>الفني</Th>
                <Th>عدد المسلّم</Th>
                <Th>صافي الربح</Th>
                <Th>نصيب الفني</Th>
                <Th>نصيب المحل</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  {[...Array(3)].map((_, r) => (
                    <tr key={r}>
                      <Td>
                        <Skel className="w-40" />
                      </Td>
                      <Td>
                        <Skel className="w-16" />
                      </Td>
                      <Td>
                        <Skel className="w-24" />
                      </Td>
                      <Td>
                        <Skel className="w-24" />
                      </Td>
                      <Td>
                        <Skel className="w-24" />
                      </Td>
                    </tr>
                  ))}
                </>
              ) : summary.perTechnician?.length ? (
                summary.perTechnician.map((t, i) => (
                  <tr
                    key={i}
                    className="odd:bg-gray-50 dark:odd:bg-gray-700/40"
                  >
                    <Td>
                      {techMap[t.techId] || t.techName || t.techId || "—"}
                    </Td>
                    <Td>{t.deliveredCount ?? "—"}</Td>
                    <Td
                      className={cls(
                        Number(t.netProfit) >= 0
                          ? "text-emerald-700"
                          : "text-red-600"
                      )}
                    >
                      {egp(Math.round(t.netProfit))}
                    </Td>
                    <Td>{egp(Math.round(t.techShare))}</Td>
                    <Td>{egp(Math.round(t.shopShare))}</Td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-3 text-center opacity-70">
                    لا بيانات
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* المعاملات + فورم */}
      <TransactionsBlock startDate={startDate} endDate={endDate} />
    </div>
  );
}

/* ================= Subcomponents ================= */
function TransactionsBlock({ startDate, endDate }) {
  const [list, setList] = useState([]);
  const [f, setF] = useState({
    type: "in",
    amount: "",
    description: "",
    date: ymdLocal(new Date()),
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState("");

  async function load() {
    setLoading(true);
    try {
      const { data } = await API.get("/accounts/transactions", {
        params: { startDate, endDate },
      });
      setList(data || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [startDate, endDate]);

  async function submit(e) {
    e.preventDefault();
    if (!f.amount) return;
    setSaving(true);
    try {
      await API.post("/accounts/transactions", {
        ...f,
        amount: Number(f.amount),
      });
      setF({
        type: "in",
        amount: "",
        description: "",
        date: ymdLocal(new Date()),
      });
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!confirm("هل تريد حذف هذه المعاملة؟")) return;
    setRemoving(id);
    try {
      await API.delete(`/accounts/transactions/${id}`);
      await load();
    } finally {
      setRemoving("");
    }
  }

  return (
    <section className="grid lg:grid-cols-3 gap-3">
      {/* Form */}
      <div className="p-3 rounded-2xl bg-white dark:bg-gray-800 shadow-sm">
        <h2 className="font-semibold mb-3">معاملة جديدة</h2>
        <form onSubmit={submit} className="space-y-2">
          <select
            value={f.type}
            onChange={(e) => setF({ ...f, type: e.target.value })}
            className="w-full px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700"
            aria-label="نوع المعاملة"
          >
            <option value="in">داخل</option>
            <option value="out">خارج</option>
          </select>
          <input
            type="number"
            value={f.amount}
            onChange={(e) => setF({ ...f, amount: e.target.value })}
            className="w-full px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700"
            placeholder="المبلغ"
            min="0"
            inputMode="numeric"
          />
          <input
            type="date"
            value={f.date}
            onChange={(e) => setF({ ...f, date: e.target.value })}
            className="w-full px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700"
            aria-label="تاريخ المعاملة"
          />
          <textarea
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
            className="w-full px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700"
            placeholder="الوصف (اختياري)"
            rows={3}
          />
          <button
            className="px-4 py-2 rounded-xl bg-blue-600 text-white inline-flex items-center gap-2 disabled:opacity-60"
            disabled={saving}
          >
            {saving && <Spinner />} <span>حفظ</span>
          </button>
        </form>
      </div>

      {/* List */}
      <div className="p-3 rounded-2xl bg-white dark:bg-gray-800 shadow-sm lg:col-span-2">
        <h2 className="font-semibold mb-3">كل المعاملات داخل الفترة</h2>

        {/* Cards (mobile) */}
        <div className="grid gap-2 sm:hidden">
          {loading && (
            <>
              <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                <Skel className="w-28" />
                <Skel className="w-40 mt-2" />
              </div>
              <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                <Skel className="w-24" />
                <Skel className="w-36 mt-2" />
              </div>
            </>
          )}
          {!loading && !list.length && (
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 text-center opacity-70">
              لا يوجد معاملات
            </div>
          )}
          {!loading &&
            list.map((t) => {
              const isIn = t.type === "in";
              return (
                <article
                  key={t._id}
                  className="p-3 rounded-xl border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cls(
                        "px-2 py-0.5 rounded-full text-xs",
                        isIn
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-700"
                      )}
                    >
                      {isIn ? "داخل" : "خارج"}
                    </span>
                    <span className="text-sm font-semibold">
                      {egp(t.amount)}
                    </span>
                  </div>
                  <div className="mt-2 text-xs opacity-70">
                    {formatDate(t.date)}
                  </div>
                  {!!t.description && (
                    <div className="mt-1 text-sm">{t.description}</div>
                  )}
                  <div className="mt-2">
                    <button
                      className="px-3 py-1.5 rounded bg-red-600 text-white text-sm disabled:opacity-60"
                      onClick={() => remove(t._id)}
                      disabled={removing === t._id}
                    >
                      {removing === t._id ? "جارٍ الحذف…" : "حذف"}
                    </button>
                  </div>
                </article>
              );
            })}
        </div>

        {/* Table (desktop) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right">
                <Th>النوع</Th>
                <Th>المبلغ</Th>
                <Th>التاريخ</Th>
                <Th>الوصف</Th>
                <Th>إجراءات</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  {[...Array(3)].map((_, r) => (
                    <tr key={r}>
                      <Td>
                        <Skel className="w-16" />
                      </Td>
                      <Td>
                        <Skel className="w-24" />
                      </Td>
                      <Td>
                        <Skel className="w-28" />
                      </Td>
                      <Td>
                        <Skel className="w-40" />
                      </Td>
                      <Td>
                        <Skel className="w-16" />
                      </Td>
                    </tr>
                  ))}
                </>
              ) : list.length ? (
                list.map((t) => (
                  <tr
                    key={t._id}
                    className="odd:bg-gray-50 dark:odd:bg-gray-700/40"
                  >
                    <Td>
                      <span
                        className={cls(
                          "px-2 py-0.5 rounded-full text-xs",
                          t.type === "in"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-700"
                        )}
                      >
                        {t.type === "in" ? "داخل" : "خارج"}
                      </span>
                    </Td>
                    <Td>{egp(t.amount)}</Td>
                    <Td>{formatDate(t.date)}</Td>
                    <Td>{t.description || "—"}</Td>
                    <Td>
                      <button
                        className="px-2 py-1 rounded bg-red-600 text-white text-xs disabled:opacity-60"
                        onClick={() => remove(t._id)}
                        disabled={removing === t._id}
                      >
                        {removing === t._id ? "جارٍ الحذف…" : "حذف"}
                      </button>
                    </Td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-3 text-center opacity-70">
                    لا يوجد معاملات
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Btn({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cls(
        "px-3 py-2 rounded-xl border text-sm",
        active
          ? "bg-blue-600 text-white border-blue-600"
          : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
      )}
    >
      {label}
    </button>
  );
}

function KpiCard({
  title,
  value,
  className = "",
  highlight = false,
  positive = true,
}) {
  return (
    <div
      className={cls(
        "p-4 rounded-2xl bg-white dark:bg-gray-800 shadow-sm",
        highlight &&
          (positive ? "ring-1 ring-emerald-300" : "ring-1 ring-red-300"),
        className
      )}
    >
      <div className="text-sm opacity-70">{title}</div>
      <div
        className={cls(
          "text-2xl font-bold mt-1",
          highlight && (positive ? "text-emerald-700" : "text-red-600")
        )}
      >
        {egp(Math.round(value || 0))}
      </div>
    </div>
  );
}

function KV({ k, v }) {
  return (
    <div className="rounded-lg bg-gray-50 dark:bg-gray-700/40 p-2">
      <div className="text-xs opacity-70">{k}</div>
      <div className="font-medium break-words">{v}</div>
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
function Td({ children }) {
  return <td className="p-2">{children}</td>;
}
