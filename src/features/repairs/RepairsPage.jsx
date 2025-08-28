import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../../lib/api";
import { listRepairs, updateRepairStatus, updateRepair } from "./repairsApi";
import formatDate from "../../utils/formatDate";
import statusOptions from "../../utils/statusOptions";
import useAuthStore from "../auth/authStore";
import DeliveryModal from "../../components/DeliveryModal";
import StatusSelect from "../../components/StatusSelect";

/* ========= Helpers ========= */
function inRange(dateISO, startStr, endStr) {
  if (!dateISO || !startStr || !endStr) return false;
  const d = new Date(dateISO);
  const start = new Date(`${startStr}T00:00:00`);
  const end = new Date(`${endStr}T23:59:59.999`);
  return d >= start && d <= end;
}

function isOldRepair(r, quick, startStr, endStr) {
  if (quick === "all" || !startStr || !endStr) return false;
  const deliveredIn = inRange(r.deliveryDate, startStr, endStr);
  const createdIn = inRange(r.createdAt, startStr, endStr);
  return deliveredIn && !createdIn;
}

// تاريخ محلي YYYY-MM-DD بدون UTC
function ymdLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function RepairsPage() {
  const mobileRepairsFilter = useRef(null);

  function showMobileFilter(e) {
    e.target.style.transition = "bottom 0.3s linear;";
    mobileRepairsFilter.current.classList.toggle("show");
    if (mobileRepairsFilter.current.classList.contains("show")) {
      e.target.style.bottom = "330px";
    } else {
      e.target.style.bottom = "12px";
    }
  }

  useEffect(() => {
    const h = () => load(); // ⬅️ كان refetch، خلّيه يستدعي load()
    window.addEventListener("repairs:refresh", h);
    return () => window.removeEventListener("repairs:refresh", h);
  }, []);
  useEffect(() => {
    async function onUpdateOne(e) {
      const id = e?.detail?.id;
      if (!id) return;
      try {
        const { data } = await API.get(`/repairs/${id}`); // يجيب الصيانة المحدثة فقط
        setList((prev) => {
          const idx = prev.findIndex(
            (x) => String(x._id || x.id) === String(id)
          );
          if (idx === -1) {
            // مش موجودة في الصفحة (يمكن خارج الفلترة الحالية) → سيبها أو أضفها لو حابب
            return prev;
          }
          const next = prev.slice();
          next[idx] = data; // استبدال العنصر بالنسخة الجديدة
          return next;
        });
      } catch (err) {
        // في حال فشل الطلب (نادراً) نرجع للخطة ب: تحميل القائمة كلها
        try {
          await load();
        } catch {}
      }
    }
    window.addEventListener("repairs:update-one", onUpdateOne);
    return () => window.removeEventListener("repairs:update-one", onUpdateOne);
  }, []);
  const { user } = useAuthStore();
  const navigation = useNavigate();
  useEffect(() => {
    if (!user) {
      navigation(0);
    }
  }, [user]);

  const isAdmin = user?.role === "admin" || user?.permissions?.adminOverride;
  const canViewAll =
    isAdmin || user?.permissions?.addRepair || user?.permissions?.receiveDevice;

  const canEditAll = isAdmin || user?.permissions?.editRepair;
  const canAddRepair =
    isAdmin ||
    user?.permissions?.adminOverride ||
    user?.permissions?.addRepair ||
    user?.permissions?.receiveDevice;

  // صلاحية الحذف
  const canDeleteAll =
    isAdmin ||
    user?.permissions?.adminOverride ||
    user?.permissions?.deleteRepair;

  // لعرض/إخفاء الفلاتر
  const canUseRepairFilters = isAdmin || user?.permissions?.editRepair;

  const todayStr = useMemo(() => ymdLocal(new Date()), []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return ymdLocal(d);
  }, []);

  const [quick, setQuick] = useState("today"); // today | yesterday | all | custom
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [technician, setTechnician] = useState("");
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [techs, setTechs] = useState([]);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  // حذف (حالة زر)
  const [deletingId, setDeletingId] = useState(null);

  // Modal (تسليم)
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [deliverTarget, setDeliverTarget] = useState(null);
  const [deliverRequirePassword, setDeliverRequirePassword] = useState(false);

  // أخطاء عامة
  const [error, setError] = useState("");

  // تحميل الفنيين مرة واحدة
  useEffect(() => {
    (async () => {
      try {
        const t = await API.get("/technicians").then((r) => r.data);
        setTechs(t);
      } catch {}
    })();
  }, []);

  // أزرار المدى السريع
  function applyQuick(qk) {
    setQuick(qk);
    if (qk === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (qk === "yesterday") {
      setStartDate(yesterdayStr);
      setEndDate(yesterdayStr);
    } else if (qk === "all") {
      setStartDate("");
      setEndDate("");
    }
  }

  // تحميل القائمة
  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (q) params.q = q;
      if (status) params.status = status;
      if (canViewAll && technician) params.technician = technician;

      // مهم: أرسل التاريخ فقط بدون أوقات، عشان السيرفر يحسب بداية/نهاية اليوم محليًا
      if (quick !== "all") {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }

      const data = await listRepairs(params);
      setList(data);
    } catch (e) {
      setError(e?.response?.data?.message || "تعذر تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }

  // حمّل عند أول مرة
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // حمّل تلقائيًا عند تغير الفلاتر
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quick, startDate, endDate, status, technician, q, canViewAll]);

  function openDeliverModal(r) {
    const isAssigned =
      r.technician &&
      (r.technician._id || r.technician) === (user?.id || user?._id);
    setDeliverRequirePassword(!canEditAll && isAssigned);
    setDeliverTarget(r);
    setDeliverOpen(true);
  }

  async function submitDeliver(payload) {
    try {
      // توحيد شكل الأجزاء + التواريخ
      const parts = (payload.parts || []).map((p) => ({
        name: p.name || "",
        cost: p.cost ? Number(p.cost) : 0,
        supplier: p.supplier || undefined,
        source: p.source || undefined,
        purchaseDate: p.purchaseDate
          ? new Date(p.purchaseDate).toISOString()
          : undefined,
      }));

      const body = {
        status: "تم التسليم",
        finalPrice: payload.finalPrice ? Number(payload.finalPrice) : 0,
        parts,
        ...(payload.password ? { password: payload.password } : {}),
      };

      // مهم: استخدم updateRepair بدل updateRepairStatus
      await updateRepair(deliverTarget._id, body);

      setDeliverOpen(false);
      setDeliverTarget(null);
      await load();
    } catch (e) {
      alert(e?.response?.data?.message || "خطأ أثناء إتمام التسليم");
    }
  }

  async function changeStatusInline(r, nextStatus) {
    try {
      if (nextStatus === "تم التسليم") {
        openDeliverModal(r);
        return;
      }
      if (nextStatus === "مرفوض") {
        // مجرد تغيير الحالة الآن — قيمة المكان هتتحدد من الـ select المخصص اللي هيظهر
        await updateRepairStatus(r._id, { status: nextStatus });
        await load();
        return;
      }
      const isAssigned =
        r.technician &&
        (r.technician._id || r.technician) === (user?.id || user?._id);
      let body = { status: nextStatus };
      if (!canEditAll && isAssigned) {
        const password = window.prompt("ادخل كلمة السر لتأكيد تغيير الحالة");
        if (!password) return;
        body.password = password;
      }
      await updateRepairStatus(r._id, body);
      await load();
    } catch (e) {
      alert(e?.response?.data?.message || "حدث خطأ أثناء تحديث الحالة");
    }
  }

  async function changeRejectedLocation(r, loc) {
    try {
      const isAssigned =
        r.technician &&
        (r.technician._id || r.technician) === (user?.id || user?._id);

      const body = { status: "مرفوض", rejectedDeviceLocation: loc };
      if (!canEditAll && isAssigned) {
        const password = window.prompt(
          "ادخل كلمة السر لتأكيد تغيير مكان الجهاز"
        );
        if (!password) return;
        body.password = password;
      }

      await updateRepairStatus(r._id, body);
      await load();
    } catch (e) {
      alert(e?.response?.data?.message || "حدث خطأ أثناء تحديث مكان الجهاز");
    }
  }

  // ====== حذف صيانة ======
  async function handleDelete(r) {
    if (!canDeleteAll) return;
    const confirm = window.prompt(
      `للتأكيد اكتب كلمة: حذف\n#${r.repairId} — ${r.deviceType} — ${r.customerName}`,
      ""
    );
    if (confirm !== "حذف") return;
    try {
      setDeletingId(r._id);
      await API.delete(`/repairs/${r._id}`);
      await load();
    } catch (e) {
      alert(e?.response?.data?.message || "تعذر حذف الصيانة");
    } finally {
      setDeletingId(null);
    }
  }

  /* ====== UI Components ====== */
  const QuickBtn = ({ label, icon, active, onClick }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition
      ${
        active
          ? "bg-blue-600 text-white border-blue-600"
          : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
      }`}
      aria-pressed={active}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </button>
  );

  const StatusPill = ({ s }) => {
    const map = {
      "في الانتظار": "bg-gray-100 text-gray-800 dark:bg-gray-700",
      "جاري العمل":
        "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
      مكتمل:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
      "تم التسليم":
        "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200",
      مرفوض: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
      مرتجع:
        "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200",
    };
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          map[s] || "bg-gray-100 dark:bg-gray-700"
        }`}
      >
        {s}
      </span>
    );
  };

  const SkeletonRow = () => (
    <tr className="animate-pulse">
      {Array.from({ length: 13 }).map((_, i) => (
        <td key={i} className="p-2">
          <div className="h-3 rounded bg-gray-200 dark:bg-gray-700 w-full" />
        </td>
      ))}
    </tr>
  );

  const EmptyState = () => (
    <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 text-center">
      <div className="text-3xl mb-2">🔍</div>
      <div className="font-semibold mb-1">لا توجد نتائج لهذا الفلتر</div>
      <div className="opacity-70 mb-3 text-sm">
        جرّب توسيع المدى الزمني أو إزالة بعض الفلاتر.
      </div>
      {canAddRepair && (
        <Link
          to="/repairs/new"
          className="inline-block px-4 py-2 rounded-xl bg-blue-600 text-white"
        >
          + إضافة صيانة
        </Link>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* رأس الصفحة */}
      {/* sticky top-0 z-20 */}
      <header className="flex items-center justify-between  bg-gradient-to-b from-white/80 to-white/0 dark:from-gray-900/80 backdrop-blur py-2">
        <h1 className="text-xl font-bold">الصيانات</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            تحديث
          </button>
          {canAddRepair && (
            <Link
              to="/repairs/new"
              className="px-3 py-2 rounded-xl bg-blue-600 text-white hover:opacity-90"
            >
              + إضافة صيانة
            </Link>
          )}
        </div>
      </header>

      {/* الفلاتر */}
      {canUseRepairFilters && (
        <>
          <button
            onClick={showMobileFilter}
            className="btn show-mobile-repairs-filter-btn fixed bottom-[12px] left-[50%] -translate-x-1/2 z-10 px-4 py-2 w-64 rounded-[15px] bg-blue-600 text-white shadow-lg md:hidden"
          >
            بحث 🔍
          </button>
          <section
            ref={mobileRepairsFilter}
            className="fixed bottom-[12px] left-[12px] mobile-repairs-filters md:static p-3 rounded-2xl bg-white dark:bg-gray-800 shadow-sm space-y-3"
          >
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
              <div className="flex gap-2  all-full-width">
                <QuickBtn
                  label="اليوم"
                  icon="📅"
                  active={quick === "today"}
                  onClick={() => applyQuick("today")}
                />
                <QuickBtn
                  label="أمس"
                  icon="🕓"
                  active={quick === "yesterday"}
                  onClick={() => applyQuick("yesterday")}
                />
                <QuickBtn
                  label="جميع الأوقات"
                  icon="∞"
                  active={quick === "all"}
                  onClick={() => applyQuick("all")}
                />
              </div>
              <div className="hidden sm:block opacity-60 self-center">أو</div>
              <div className="col-span-2 sm:flex sm:items-center sm:gap-2 date-filter">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setQuick("custom");
                  }}
                  className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 w-full sm:w-auto"
                  aria-label="بداية المدى الزمني"
                />
                <span className="mx-1 opacity-60 hidden sm:inline">—</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setQuick("custom");
                  }}
                  className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 w-full sm:w-auto"
                  aria-label="نهاية المدى الزمني"
                />
                <button
                  onClick={load}
                  className="mt-2 sm:mt-0 sm:ml-2 px-4 py-2 rounded-xl bg-blue-600 text-white w-full sm:w-auto"
                >
                  تطبيق
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-2">
              <div className="md:col-span-2">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") load();
                  }}
                  placeholder="بحث (اسم/هاتف/جهاز/عطل)"
                  className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 w-full"
                  aria-label="بحث"
                />
              </div>
              <div>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 w-full"
                  aria-label="تصفية بالحالة"
                >
                  <option value="">كل الحالات</option>
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              {canViewAll && (
                <div>
                  <select
                    value={technician}
                    onChange={(e) => setTechnician(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 w-full"
                    aria-label="تصفية بالفني"
                  >
                    <option value="">كل الفنيين</option>
                    {techs.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </section>
        </>
      )}
      {error && (
        <div className="p-3 rounded-xl bg-red-50 text-red-800">{error}</div>
      )}

      {/* الديسكتوب */}
      <section className="hidden md:block p-3 rounded-2xl bg-white dark:bg-gray-800 shadow-sm overflow-x-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm opacity-70">
            النتائج: {loading ? "…" : list.length}
          </div>
        </div>
        <table className="w-full text-sm border-separate [border-spacing:0]">
          <thead className="sticky top-[0] bg-white dark:bg-gray-800 shadow-sm">
            <tr className="text-right">
              <Th>#</Th>
              <Th>العميل</Th>
              <Th>الهاتف</Th>
              <Th>الجهاز</Th>
              <Th>العطل</Th>
              <Th>اللون</Th>
              <Th>الفني</Th>
              {/* <Th>المستلم</Th> */}
              <Th>الحالة</Th>
              <Th>السعر</Th>
              <Th>تاريخ الإنشاء</Th>
              {/* <Th>تاريخ التسليم</Th> */}
              <Th>إجراءات</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={13} className="p-0">
                  <EmptyState />
                </td>
              </tr>
            ) : (
              list.map((r) => {
                const old = isOldRepair(r, quick, startDate, endDate);
                return (
                  <tr
                    key={r._id}
                    className={`odd:bg-gray-50 rounded-[4px] dark:odd:bg-gray-700/40 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 transition ${
                      old ? "ring-1 ring-yellow-200 dark:ring-yellow-700" : ""
                    }`}
                  >
                    <Td>
                      {r.repairId}
                      {old && (
                        <span className="ml-1 px-2 py-0.5 rounded-full text-[11px] bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
                          قديمة
                        </span>
                      )}
                    </Td>
                    <Td>{r.customerName}</Td>
                    <Td>{r.phone || "—"}</Td>
                    <Td className="font-medium">{r.deviceType}</Td>
                    <Td
                      className="max-w-[220px] truncate"
                      title={r.issue || ""}
                    >
                      {r.issue || "—"}
                    </Td>
                    <Td>{r.color || "—"}</Td>
                    <Td>{r?.technician?.name || "—"}</Td>
                    {/* <Td>{r?.createdBy?.name || r?.recipient?.name || "—"}</Td> */}
                    <Td>
                      <div className="flex items-center gap-2">
                        {/* <StatusPill s={r.status} /> */}
                        <StatusSelect
                          value={r.status}
                          onChange={(next) => changeStatusInline(r, next)}
                        />
                        {r.status === "مرفوض" && (
                          <select
                            value={r.rejectedDeviceLocation || "بالمحل"}
                            onChange={(e) =>
                              changeRejectedLocation(r, e.target.value)
                            }
                            className="px-2 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 mt-1"
                            aria-label={`مكان الجهاز للصيانة رقم ${r.repairId}`}
                            title="مكان الجهاز عند الرفض"
                          >
                            <option value="بالمحل">بالمحل</option>
                            <option value="مع العميل">مع العميل</option>
                          </select>
                        )}
                      </div>
                    </Td>
                    <Td>
                      {typeof r.finalPrice === "number" ? r.finalPrice : "—"}
                    </Td>
                    <Td>{formatDate(r.createdAt)}</Td>
                    {/* <Td>{r.deliveryDate ? formatDate(r.deliveryDate) : "—"}</Td> */}
                    <Td>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/repairs/${r._id}`}
                          className="px-2 py-1 rounded-lg bg-gray-200 dark:bg-gray-700"
                        >
                          فتح
                        </Link>
                        {canEditAll && (
                          <Link
                            to={`/repairs/${r._id}/edit`}
                            className="px-2 py-1 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
                          >
                            تعديل
                          </Link>
                        )}
                        {canDeleteAll && (
                          <button
                            onClick={() => handleDelete(r)}
                            disabled={deletingId === r._id}
                            className="px-2 py-1 rounded-lg bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 disabled:opacity-50"
                            aria-label={`حذف الصيانة رقم ${r.repairId}`}
                            title="حذف"
                          >
                            {deletingId === r._id ? "جارٍ…" : "حذف"}
                          </button>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      {/* الموبايل */}
      <section className="md:hidden space-y-2">
        {loading ? (
          <div className="p-3 rounded-2xl bg-white dark:bg-gray-800 animate-pulse h-24" />
        ) : list.length === 0 ? (
          <EmptyState />
        ) : (
          list.map((r) => (
            <div
              key={r._id}
              className="p-3 rounded-2xl bg-white dark:bg-gray-800 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="font-bold">
                  #{r.repairId} — {r.deviceType}
                </div>
                <StatusPill s={r.status} />
              </div>
              <div className="text-sm opacity-80">
                {r.customerName} • {r.phone || "—"}
              </div>
              <div className="text-xs opacity-70 mt-1">
                {r?.technician?.name
                  ? `الفني: ${r.technician.name}`
                  : "الفني: —"}{" "}
                • المسجّل: {r?.createdBy?.name || r?.recipient?.name || "—"}
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                <Info label="العطل" value={r.issue || "—"} />
                <Info label="اللون" value={r.color || "—"} />
                <Info
                  label="السعر"
                  value={typeof r.price === "number" ? r.price : "—"}
                />
                <Info label="إنشاء" value={formatDate(r.createdAt)} />
                <Info
                  label="التسليم"
                  value={r.deliveryDate ? formatDate(r.deliveryDate) : "—"}
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="flex gap-2">
                  <StatusSelect
                    value={r.status}
                    onChange={(next) => changeStatusInline(r, next)}
                  />
                  {r.status === "مرفوض" && (
                    <select
                      value={r.rejectedDeviceLocation || "بالمحل"}
                      onChange={(e) =>
                        changeRejectedLocation(r, e.target.value)
                      }
                      className="px-2 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200"
                      aria-label="مكان الجهاز عند الرفض"
                    >
                      <option value="بالمحل">بالمحل</option>
                      <option value="مع العميل">مع العميل</option>
                    </select>
                  )}
                </div>
                <Link
                  to={`/repairs/${r._id}`}
                  className="px-3 py-1 rounded-lg bg-gray-200 dark:bg-gray-700"
                >
                  فتح
                </Link>
                {canEditAll && (
                  <Link
                    to={`/repairs/${r._id}/edit`}
                    className="px-3 py-1 rounded-lg bg-blue-600 text-white"
                  >
                    تعديل
                  </Link>
                )}
                {canDeleteAll && (
                  <button
                    onClick={() => handleDelete(r)}
                    disabled={deletingId === r._id}
                    className="px-3 py-1 rounded-lg bg-red-600 text-white disabled:opacity-50"
                    aria-label={`حذف الصيانة رقم ${r.repairId}`}
                    title="حذف"
                  >
                    {deletingId === r._id ? "جارٍ…" : "حذف"}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </section>

      {/* مودال التسليم */}
      <DeliveryModal
        open={deliverOpen}
        onClose={() => {
          setDeliverOpen(false);
          setDeliverTarget(null);
        }}
        onSubmit={submitDeliver}
        initialFinalPrice={deliverTarget ? deliverTarget.finalPrice ?? 0 : 0}
        initialParts={deliverTarget ? deliverTarget.parts || [] : []}
        requirePassword={deliverRequirePassword}
      />
    </div>
  );
}

/* ====== Sub Components ====== */
function Th({ children }) {
  return (
    <th className="p-2 text-xs font-semibold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
      {children}
    </th>
  );
}
function Td({ children, className = "" }) {
  return <td className={`p-2 align-center ${className}`}>{children}</td>;
}
function Info({ label, value }) {
  return (
    <div className="p-2 rounded-xl bg-gray-50 dark:bg-gray-700/40">
      <div className="text-[11px] opacity-70">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
