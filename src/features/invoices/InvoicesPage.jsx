// src/features/invoices/InvoicesPage.jsx
import { useEffect, useMemo, useState } from "react";
import API from "../../lib/api";
import formatDate from "../../utils/formatDate";

/* ============== Helpers ============== */
function ymdLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function egp(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  // عرض أرقام مناسبة للمستخدم المصري/العربي
  return `ج.م ${num.toLocaleString("ar-EG", { maximumFractionDigits: 0 })}`;
}

/* Skeleton بسيط بدون CSS إضافي */
function Skel({ className = "" }) {
  return (
    <div
      className={`h-4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse ${className}`}
    />
  );
}

/* سبِنر صغير */
function Spinner({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`w-4 h-4 animate-spin ${className}`}
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

export default function InvoicesPage() {
  /* ====== زمن افتراضي ====== */
  const today = useMemo(() => ymdLocal(new Date()), []);
  const yesterday = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return ymdLocal(d);
  }, []);

  /* ====== State ====== */
  const [quick, setQuick] = useState("today");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [byVendor, setByVendor] = useState([]);
  const [totals, setTotals] = useState({ totalParts: 0, count: 0 });
  const [err, setErr] = useState("");
  const [toggling, setToggling] = useState(null); // partId الجاري تحديثه

  // فلتر المدفوع/غير المدفوع/الكل
  const [paidFilter, setPaidFilter] = useState("all"); // 'all' | 'unpaid' | 'paid'

  // خريطة أسماء الفنيين
  const [techMap, setTechMap] = useState({});

  /* ====== Effects ====== */
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

  // حدث خارجي لتحديث الصفحة
  useEffect(() => {
    const h = () => load();
    window.addEventListener("repairs:refresh", h);
    return () => window.removeEventListener("repairs:refresh", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // تحميل العناصر وفق paidFilter
  async function loadItems() {
    const params = {};
    if (quick !== "all") {
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
    }
    if (paidFilter) params.paid = paidFilter; // all | unpaid | paid
    const { data } = await API.get("/invoices/parts", { params });
    setItems(data.items || []);
    return data;
  }

  // تحميل الملخص/الإجماليات دائمًا بناءً على "غير المدفوع"
  async function loadAggregatesUnpaid() {
    const params = {};
    if (quick !== "all") {
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
    }
    params.paid = "unpaid";
    const { data } = await API.get("/invoices/parts", { params });
    setByVendor(data.byVendor || []);
    setTotals(data.totals || { totalParts: 0, count: 0 });
    return data;
  }

  // تحميل الكل (عناصر + ملخّص)
  async function load() {
    setLoading(true);
    setErr("");
    try {
      await Promise.all([loadItems(), loadAggregatesUnpaid()]);
    } catch (e) {
      setErr(e?.response?.data?.message || "تعذر تحميل البيانات");
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
  }, [quick, startDate, endDate, paidFilter]);

  /* ====== Actions ====== */
  async function togglePaid(item, next) {
    if (toggling === item.part.id) return;

    const prev = {
      paid: !!item.part.paid,
      paidAt: item.part.paidAt || null,
      paidBy: item.part.paidBy || null,
    };

    setToggling(item.part.id);

    // تحديث تفاؤلي
    setItems((prevList) =>
      prevList.map((it) =>
        it.part.id === item.part.id
          ? {
              ...it,
              part: {
                ...it.part,
                paid: next,
                paidAt: next ? new Date().toISOString() : null,
                paidBy: next ? "me" : null,
              },
            }
          : it
      )
    );

    try {
      const { data } = await API.post(
        `/invoices/parts/${item.repair}/${item.part.id}/mark-paid`,
        { paid: next }
      );

      // تثبيت من السيرفر
      setItems((prevList) =>
        prevList.map((it) =>
          it.part.id === item.part.id
            ? {
                ...it,
                part: {
                  ...it.part,
                  paid: data?.part?.paid ?? next,
                  paidAt:
                    data?.part?.paidAt ??
                    (next ? new Date().toISOString() : null),
                  paidBy: data?.part?.paidBy ?? (next ? it.part.paidBy : null),
                },
              }
            : it
        )
      );

      await loadAggregatesUnpaid();
    } catch (e) {
      // رجوع للحالة القديمة
      setItems((prevList) =>
        prevList.map((it) =>
          it.part.id === item.part.id
            ? { ...it, part: { ...it.part, ...prev } }
            : it
        )
      );
      alert(e?.response?.data?.message || "تعذر تحديث حالة الدفع");
    } finally {
      setToggling(null);
    }
  }

  /* ====== UI ====== */
  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">الفواتير (قطع الغيار)</h1>
      </header>

      {/* فلاتر الزمن + حالة الدفع (Sticky على الموبايل) */}
      <section className="p-3 rounded-2xl bg-white dark:bg-gray-800 shadow-sm space-y-2 sticky top-[70px] sm:top-0 z-10">
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

          {/* فلتر حالة الدفع */}
          <select
            aria-label="تصفية حسب حالة الدفع"
            value={paidFilter}
            onChange={(e) => setPaidFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700"
            title="تصفية حسب حالة الدفع"
          >
            <option value="all">الكل (مدفوع + غير مدفوع)</option>
            <option value="unpaid">غير المدفوع فقط</option>
            <option value="paid">المدفوع فقط</option>
          </select>

          <button
            onClick={load}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white"
            aria-label="تطبيق الفلتر"
          >
            تطبيق
          </button>
        </div>
      </section>

      {err && (
        <div className="p-3 rounded-xl bg-red-50 text-red-800">{err}</div>
      )}

      {/* ملخص الموردين — بطاقات على الموبايل + جدول على md+ */}
      <section className="p-3 rounded-2xl bg-white dark:bg-gray-800 shadow-sm">
        <h2 className="font-semibold mb-1">ملخص لكل مورد (غير المدفوع)</h2>
        <div className="text-xs opacity-70 mb-3">
          الإجمالي هنا يعكس المتبقي غير المدفوع فقط، حتى لو الجدول يعرض الكل.
        </div>

        {/* Cards (mobile) */}
        <div className="grid gap-2 sm:hidden">
          {loading && (
            <>
              <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                <Skel className="w-24" />
                <Skel className="w-40 mt-2" />
              </div>
              <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                <Skel className="w-28" />
                <Skel className="w-32 mt-2" />
              </div>
            </>
          )}
          {!loading && !byVendor.length && (
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 text-center opacity-70">
              لا توجد بيانات
            </div>
          )}
          {!loading &&
            byVendor.map((v, i) => (
              <article
                key={i}
                className="p-3 rounded-xl border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{v._id.vendor || "—"}</div>
                  <div className="text-xs opacity-70">
                    {v._id.source || "—"}
                  </div>
                </div>
                <div className="mt-2 text-sm flex items-center justify-between">
                  <span className="opacity-70">عدد القطع</span>
                  <strong>{v.count || 0}</strong>
                </div>
                <div className="mt-1 text-sm flex items-center justify-between">
                  <span className="opacity-70">إجمالي السعر</span>
                  <strong>{egp(v.total || 0)}</strong>
                </div>
              </article>
            ))}

          {/* Totals card */}
          {!!byVendor.length && (
            <article className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40">
              <div className="flex items-center justify-between">
                <div className="font-semibold">الإجمالي</div>
                <div className="text-xs opacity-70">—</div>
              </div>
              <div className="mt-2 text-sm flex items-center justify-between">
                <span className="opacity-70">عدد القطع</span>
                <strong>{totals.count}</strong>
              </div>
              <div className="mt-1 text-sm flex items-center justify-between">
                <span className="opacity-70">إجمالي السعر</span>
                <strong>{egp(totals.totalParts)}</strong>
              </div>
            </article>
          )}
        </div>

        {/* Table (desktop) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right">
                <Th>المورد</Th>
                <Th>المصدر</Th>
                <Th>عدد القطع</Th>
                <Th>إجمالي السعر</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <tr>
                    <Td>
                      <Skel className="w-24" />
                    </Td>
                    <Td>
                      <Skel className="w-20" />
                    </Td>
                    <Td>
                      <Skel className="w-12" />
                    </Td>
                    <Td>
                      <Skel className="w-24" />
                    </Td>
                  </tr>
                  <tr>
                    <Td>
                      <Skel className="w-28" />
                    </Td>
                    <Td>
                      <Skel className="w-16" />
                    </Td>
                    <Td>
                      <Skel className="w-10" />
                    </Td>
                    <Td>
                      <Skel className="w-20" />
                    </Td>
                  </tr>
                </>
              ) : (
                byVendor.map((v, i) => (
                  <tr
                    key={i}
                    className="odd:bg-gray-50 dark:odd:bg-gray-700/40"
                  >
                    <Td>{v._id.vendor || "—"}</Td>
                    <Td>{v._id.source || "—"}</Td>
                    <Td>{v.count || 0}</Td>
                    <Td>{egp(v.total || 0)}</Td>
                  </tr>
                ))
              )}
              {!loading && !byVendor.length && (
                <tr>
                  <td colSpan={4} className="p-3 text-center opacity-70">
                    لا توجد بيانات
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="font-bold border-t">
                <Td>الإجمالي</Td>
                <Td>—</Td>
                <Td>{totals.count}</Td>
                <Td>{egp(totals.totalParts)}</Td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* كل القطع داخل الفترة — Cards على الموبايل + جدول على md+ */}
      <section className="p-3 rounded-2xl bg-white dark:bg-gray-800 shadow-sm">
        <h2 className="font-semibold mb-3">كل قطع الغيار داخل الفترة</h2>

        {/* Cards (mobile) */}
        <div className="grid gap-2 sm:hidden">
          {loading && (
            <>
              <CardSkeleton />
              <CardSkeleton />
            </>
          )}
          {!loading && !items.length && (
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 text-center opacity-70">
              لا توجد قطع غيار داخل هذه الفترة
            </div>
          )}
          {!loading &&
            items.map((it, i) => (
              <PartCard
                key={i}
                it={it}
                techMap={techMap}
                toggling={toggling}
                onTogglePaid={togglePaid}
              />
            ))}
        </div>

        {/* Table (desktop) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right">
                <Th># الصيانة</Th>
                <Th>الجهاز</Th>
                <Th>العميل</Th>
                <Th>الفني</Th>
                <Th>القطعة</Th>
                <Th>المورد</Th>
                <Th>المصدر</Th>
                <Th>السعر</Th>
                <Th>مدفوع؟</Th>
                <Th>تاريخ الشراء</Th>
                <Th>حالة الصيانة</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  {[...Array(3)].map((_, r) => (
                    <tr key={r}>
                      {[...Array(11)].map((_, c) => (
                        <Td key={c}>
                          <Skel className="w-20" />
                        </Td>
                      ))}
                    </tr>
                  ))}
                </>
              ) : items.length ? (
                items.map((it, i) => (
                  <tr
                    key={i}
                    className="odd:bg-gray-50 dark:odd:bg-gray-700/40"
                  >
                    <Td>{it.repairId}</Td>
                    <Td>{it.deviceType || "—"}</Td>
                    <Td>{it.customerName || "—"}</Td>
                    <Td>{techMap[it.technician] || "—"}</Td>
                    <Td>{it.part?.name || "—"}</Td>
                    <Td>{it.part?.vendor || it.part?.supplier || "—"}</Td>
                    <Td>{it.part?.source || "—"}</Td>
                    <Td>{egp(it.part?.price ?? it.part?.cost)}</Td>
                    <Td>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!it.part?.paid}
                          disabled={toggling === it.part?.id || loading}
                          onChange={(e) => {
                            if (toggling === it.part?.id) return;
                            togglePaid(it, e.target.checked);
                          }}
                          aria-label={`تحديد ${
                            it.part?.name || "القطعة"
                          } كمدفوعة`}
                        />
                        {toggling === it.part?.id ? (
                          <Spinner />
                        ) : (
                          <span className="text-xs opacity-70">
                            {it.part?.paid
                              ? `مدفوع منذ ${new Date(
                                  it.part?.paidAt || Date.now()
                                ).toLocaleString()}`
                              : "غير مدفوع"}
                          </span>
                        )}
                      </label>
                    </Td>
                    <Td>{it.part?.date ? formatDate(it.part.date) : "—"}</Td>
                    <Td>
                      <StatusPill status={it.status} />
                    </Td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="p-3 text-center opacity-70">
                    لا توجد قطع غيار داخل هذه الفترة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ============== Subcomponents ============== */
function Btn({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-xl border text-sm ${
        active
          ? "bg-blue-600 text-white border-blue-600"
          : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
      }`}
    >
      {label}
    </button>
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

function StatusPill({ status }) {
  const done = status === "تم التسليم" || status === "مكتمل";
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs ${
        done ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
      }`}
    >
      {done ? "تم التسليم/مكتملة" : "غير مُسلّمة بعد"}
    </span>
  );
}

/* ==== بطاقات الموبايل لصف "كل القطع داخل الفترة" ==== */
function PartCard({ it, techMap, toggling, onTogglePaid }) {
  const isToggling = toggling === it.part?.id;
  return (
    <article className="p-3 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="text-sm font-semibold">{it.part?.name || "—"}</div>
          <div className="text-xs opacity-70">
            الصيانة #{it.repairId} • {it.deviceType || "—"}
          </div>
          <div className="text-xs opacity-70">
            العميل:{" "}
            <span className="font-medium opacity-100">
              {it.customerName || "—"}
            </span>
          </div>
          <div className="text-xs opacity-70">
            الفني:{" "}
            <span className="font-medium opacity-100">
              {techMap[it.technician] || "—"}
            </span>
          </div>
        </div>
        <StatusPill status={it.status} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <KV k="المورد" v={it.part?.vendor || it.part?.supplier || "—"} />
        <KV k="المصدر" v={it.part?.source || "—"} />
        <KV k="السعر" v={egp(it.part?.price ?? it.part?.cost)} />
        <KV
          k="تاريخ الشراء"
          v={it.part?.date ? formatDate(it.part.date) : "—"}
        />
      </div>

      <div className="mt-3">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!it.part?.paid}
            disabled={isToggling}
            onChange={(e) => {
              if (isToggling) return;
              onTogglePaid(it, e.target.checked);
            }}
            aria-label={`تحديد ${it.part?.name || "القطعة"} كمدفوعة`}
          />
          {isToggling ? (
            <Spinner />
          ) : (
            <span className="text-xs opacity-70">
              {it.part?.paid
                ? `مدفوع منذ ${new Date(
                    it.part?.paidAt || Date.now()
                  ).toLocaleString()}`
                : "غير مدفوع"}
            </span>
          )}
        </label>
      </div>
    </article>
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

function CardSkeleton() {
  return (
    <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700">
      <Skel className="w-32" />
      <Skel className="w-44 mt-2" />
      <div className="grid grid-cols-2 gap-2 mt-3">
        <Skel className="h-6" />
        <Skel className="h-6" />
        <Skel className="h-6" />
        <Skel className="h-6" />
      </div>
      <Skel className="w-40 mt-3" />
    </div>
  );
}
