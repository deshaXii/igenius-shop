import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../../lib/api";
import {
  listRepairs,
  updateRepairStatus,
  updateRepair,
  setWarranty,
} from "./repairsApi";
import formatDate from "../../utils/formatDate";
import useAuthStore from "../auth/authStore";
import DeliveryModal from "../../components/DeliveryModal";
import WarrantyBadge from "../../components/WarrantyBadge";
import { SHORT_STATUS } from "../../utils/data";
import { UI } from "../../utils/ui";
import YmdLocal from "../../components/helpers/ymdLocal";
import IsOldRepair from "../../components/helpers/isOldRepair";
import hasNum from "../../components/helpers/hasNum";
import HandleWhatsAppMessage from "../../components/helpers/handleWhatsAppMessage";
import IncludeNumberField from "../../components/helpers/IncludeNumberField";
import HandlePrintReceipt from "../../components/helpers/HandlePrintReceipt";
import AfterCompleteModal from "../../components/AfterCompleteModal";

export default function RepairsPage() {
  const { user } = useAuthStore();
  const navigation = useNavigate();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [afterCompleteOpen, setAfterCompleteOpen] = useState(false);
  const [afterCompleteTarget, setAfterCompleteTarget] = useState(null);
  const [showWarrantyModal, setShowWarrantyModal] = useState(false);
  const [warrantyEnd, setWarrantyEnd] = useState("");
  const [warrantyTarget, setWarrantyTarget] = useState(null);
  const [quick, setQuick] = useState("today"); // today | yesterday | all | custom
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [technician, setTechnician] = useState("");
  const todayStr = useMemo(() => YmdLocal(new Date()), []);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [techs, setTechs] = useState([]);
  const [deps, setDeps] = useState([]);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [deliverTarget, setDeliverTarget] = useState(null);
  const [deliverRequirePassword, setDeliverRequirePassword] = useState(false);

  useEffect(() => {
    const h = () => load();
    window.addEventListener("repairs:refresh", h);
    return () => window.removeEventListener("repairs:refresh", h);
  }, []);

  useEffect(() => {
    async function onUpdateOne(e) {
      const id = e?.detail?.id;
      if (!id) return;
      try {
        const { data } = await API.get(`/repairs/${id}`);
        setList((prev) => {
          const idx = prev.findIndex(
            (x) => String(x._id || x.id) === String(id)
          );
          if (idx === -1) return prev;
          const next = prev.slice();
          next[idx] = data;
          return next;
        });
      } catch {
        try {
          await load();
        } catch {}
      }
    }
    window.addEventListener("repairs:update-one", onUpdateOne);
    return () => window.removeEventListener("repairs:update-one", onUpdateOne);
  }, []);

  useEffect(() => {
    if (!user) {
      navigation(0);
    }
  }, [user, navigation]);

  const isAdmin = user?.role === "admin" || user?.permissions?.adminOverride;
  const canViewAll =
    isAdmin || user?.permissions?.addRepair || user?.permissions?.receiveDevice;

  const canEditAll = isAdmin || user?.permissions?.editRepair;
  const canAddRepair =
    isAdmin ||
    user?.permissions?.adminOverride ||
    user?.permissions?.addRepair ||
    user?.permissions?.receiveDevice;

  const canDeleteAll =
    isAdmin ||
    user?.permissions?.adminOverride ||
    user?.permissions?.deleteRepair;

  const canUseRepairFilters = isAdmin || user?.permissions?.editRepair;

  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return YmdLocal(d);
  }, []);

  const depMap = useMemo(() => {
    const m = new Map();
    for (const d of deps) m.set(String(d._id), d.name);
    return m;
  }, [deps]);

  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const t = await API.get("/technicians").then((r) => r.data);
        setTechs(t);
      } catch {}
      try {
        const d = await API.get("/departments").then((r) => r.data || []);
        setDeps(d);
      } catch {}
    })();
  }, []);

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

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (q) params.q = q;
      if (status) params.status = status;
      if (canViewAll && technician) params.technician = technician;
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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const parts = (payload.parts || []).map((p) => ({
        name: p.name || "",
        cost: p.cost ? Number(p.cost) : 0,
        supplier: p.supplier || undefined,
        source: p.source || undefined,
        purchaseDate: p.purchaseDate
          ? new Date(p.purchaseDate).toISOString()
          : undefined,
      }));

      let body = {
        status: "تم التسليم",
        parts,
        ...(payload.password ? { password: payload.password } : {}),
      };
      body = IncludeNumberField(body, "finalPrice", payload.finalPrice);
      body = IncludeNumberField(body, "price", payload.price);

      const updated = await updateRepair(deliverTarget._id, body);

      setDeliverOpen(false);
      setDeliverTarget(null);

      if (updated?.hasWarranty === true && !updated?.warrantyEnd) {
        setWarrantyTarget(updated);
        setShowWarrantyModal(true);
      } else if (updated?.hasWarranty === true && updated?.warrantyEnd) {
        setAfterCompleteTarget(updated);
        setAfterCompleteOpen(true);
      }

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
        const body = { status: nextStatus };
        const isAssigned =
          r.technician &&
          (r.technician._id || r.technician) === (user?.id || user?._id);
        if (!canEditAll && isAssigned) {
          const password = window.prompt("ادخل كلمة السر لتأكيد تغيير الحالة");
          if (!password) return;
          body.password = password;
        }
        await updateRepairStatus(r._id, body);
        await load();
        return;
      }

      const body = { status: nextStatus };
      const isAssigned =
        r.technician &&
        (r.technician._id || r.technician) === (user?.id || user?._id);
      if (!canEditAll && isAssigned) {
        const password = window.prompt("ادخل كلمة السر لتأكيد تغيير الحالة");
        if (!password) return;
        body.password = password;
      }

      const updated = await updateRepairStatus(r._id, body);
      await load();

      if (nextStatus === "مكتمل") {
        if (updated?.hasWarranty === true && !updated?.warrantyEnd) {
          setWarrantyTarget(updated);
          setShowWarrantyModal(true);
        } else if (updated?.hasWarranty === true && updated?.warrantyEnd) {
          setAfterCompleteTarget(updated);
          setAfterCompleteOpen(true);
        }
      }
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

  /* ====== إحصاءات سريعة حسب الفلتر الحالي ====== */
  const kpis = useMemo(() => {
    const total = list.length;
    let completed = 0,
      delivered = 0,
      rejected = 0,
      warranty = 0;
    for (const r of list) {
      if (r.status === "مكتمل") completed++;
      if (r.status === "تم التسليم") delivered++;
      if (r.status === "مرفوض") rejected++;
      if (r.hasWarranty) warranty++;
    }
    return { total, completed, delivered, rejected, warranty };
  }, [list]);

  /* ====== UI Components ====== */
  const QuickBtn = ({ label, icon, active, onClick }) => (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 ${UI.btn} ${
        active
          ? "bg-indigo-600 text-white"
          : `${UI.btnGhost} bg-white dark:bg-gray-900`
      }`}
      aria-pressed={active}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </button>
  );

  const StatusPill = ({ s }) => {
    const map = {
      "في الانتظار": "bg-slate-100 text-slate-800 dark:bg-slate-700",
      "جاري العمل":
        "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
      مكتمل:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
      "تم التسليم":
        "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200",
      مرفوض: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200",
      مرتجع:
        "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200",
    };
    return (
      <span className={`${UI.pill} ${map[s] || "bg-slate-100"}`}>{s}</span>
    );
  };

  const SkeletonRow = () => (
    <tr className="animate-pulse">
      {Array.from({ length: 12 }).map((_, i) => (
        <td key={i} className="p-3">
          <div className="h-3 rounded bg-slate-200 dark:bg-slate-700 w-full" />
        </td>
      ))}
    </tr>
  );

  const EmptyState = () => (
    <div className={`${UI.card} p-6 text-center`}>
      <div className="text-3xl mb-2">🔍</div>
      <div className="font-semibold mb-1">لا توجد نتائج لهذا الفلتر</div>
      <div className="opacity-70 mb-3 text-sm">
        جرّب توسيع المدى الزمني أو إزالة بعض الفلاتر.
      </div>
      {canAddRepair && (
        <Link to="/repairs/new" className={`${UI.btn} ${UI.btnPrimary}`}>
          + إضافة صيانة
        </Link>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* ===== هيدر جذاب ===== */}
      <div className="rounded-3xl overflow-hidden">
        <div className="bg-gradient-to-l from-fuchsia-600 via-violet-600 to-indigo-700 text-white p-5 md:p-7">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">الصيانات</h1>
              <p className="opacity-90">عرض وتتبع الحالات مع فلاتر مرنة.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={load}
                className={`${UI.btn} bg-white/90 text-indigo-700 hover:opacity-90`}
              >
                تحديث
              </button>
              {canAddRepair && (
                <Link
                  to="/repairs/new"
                  className={`${UI.btn} bg-white/90 text-indigo-700 hover:opacity-90`}
                >
                  + إضافة صيانة
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== KPI Cards ===== */}
      <section className="grid grid-cols-2 mb-2 md:grid-cols-5 gap-2">
        <KPI title="الإجمالي" value={kpis.total} />
        <KPI title="مكتمل" value={kpis.completed} tone="emerald" />
        <KPI title="تم التسليم" value={kpis.delivered} tone="indigo" />
        <KPI title="مرفوض" value={kpis.rejected} tone="rose" />
        <KPI title="بضمان" value={kpis.warranty} tone="amber" />
      </section>

      {/* ===== الفلاتر ===== */}
      {canUseRepairFilters && (
        <>
          {/* زر عائم للموبايل */}
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className="fixed md:hidden bottom-3 left-1/2 -translate-x-1/2 z-40 w-64 px-4 py-2 rounded-2xl bg-indigo-600 text-white shadow-lg"
          >
            {filtersOpen ? "إغلاق البحث" : "بحث 🔍"}
          </button>

          {/* Scrim للموبايل */}
          {filtersOpen && (
            <div
              className="fixed inset-0 bg-black/40 z-30 md:hidden"
              onClick={() => setFiltersOpen(false)}
            />
          )}

          {/* Bottom Sheet (Mobile) + Static (Desktop) */}
          <section
            className={`repairs-filters
              ${UI.card} shadow-sm p-3 md:p-4 space-y-3
              md:static md:translate-y-0
              fixed md:relative left-0 right-0 z-40 md:z-auto
              md:rounded-2xl rounded-t-3xl
              md:mx-0 mx-0
              md:bottom-auto bottom-0
              transition-transform duration-300
              ${
                filtersOpen
                  ? "translate-y-0"
                  : "translate-y-full md:translate-y-0"
              }
            `}
          >
            <div className="grid sm:flex sm:flex-wrap gap-2">
              <div className="flex gap-2 grow">
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
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setQuick("custom");
                  }}
                  className={UI.input}
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
                  className={UI.input}
                  aria-label="نهاية المدى الزمني"
                />
                <button
                  onClick={load}
                  className={`${UI.btn} ${UI.btnPrimary} sm:ml-2`}
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
                  onKeyDown={(e) => e.key === "Enter" && load()}
                  placeholder="بحث (اسم/هاتف/رقم الهاتف/جهاز/عطل)"
                  className={`${UI.input} h-full`}
                  aria-label="بحث"
                />
              </div>
              <div>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={UI.input}
                  aria-label="تصفية بالحالة"
                >
                  <option value="">كل الحالات</option>
                  {SHORT_STATUS.map((s) => (
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
                    className={UI.input}
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
        <div className="p-3 rounded-2xl bg-rose-50 text-rose-800">{error}</div>
      )}

      {/* ===== الديسكتوب ===== */}
      <section
        className={`${UI.card} p-0 shadow-sm overflow-hidden hidden md:block`}
      >
        <div className="flex items-center justify-between px-4 pt-3">
          <div className="text-sm text-[16px] opacity-70">
            النتائج: {loading ? "…" : list.length}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-[16px] border-separate [border-spacing:0]">
            <thead className="sticky top-0 bg-white/95 dark:bg-gray-900/95 shadow-sm">
              <tr className="text-right">
                <Th>#</Th>
                <Th>العميل</Th>
                {/* <Th>الهاتف</Th> */}
                <Th>الجهاز</Th>
                <Th>العطل</Th>
                <Th>اللون</Th>
                <Th>الفني</Th>
                <Th>القسم الحالي</Th>
                <Th>الحالة</Th>
                <Th>السعر</Th>
                <Th>تاريخ الإنشاء</Th>
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
                  <td colSpan={12} className="p-0">
                    <EmptyState />
                  </td>
                </tr>
              ) : (
                list.map((r) => {
                  const old = IsOldRepair(r, quick, startDate, endDate);
                  const basePrice = hasNum(r.price) ? Number(r.price) : null;
                  const finalPrice = hasNum(r.finalPrice)
                    ? Number(r.finalPrice)
                    : null;
                  const depName =
                    r.currentDepartment?.name ||
                    depMap.get(String(r.currentDepartment || "")) ||
                    "—";

                  return (
                    <tr
                      key={r._id}
                      className={`odd:bg-slate-50 dark:odd:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition ${
                        r.hasWarranty
                          ? "bg-amber-50/40 dark:bg-amber-900/10"
                          : ""
                      } ${
                        old ? "ring-1 ring-amber-200 dark:ring-amber-700" : ""
                      }`}
                    >
                      <Td>
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <span className="font-mono">#{r.repairId}</span>
                          {old && (
                            <span
                              className={`${UI.pill} bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200`}
                            >
                              قديمة
                            </span>
                          )}
                          {r.hasWarranty && (
                            <WarrantyBadge until={r.warrantyEnd} />
                          )}
                        </div>
                      </Td>
                      <Td>{r.customerName}</Td>
                      {/* <Td>{r.phone || "—"}</Td> */}
                      <Td className="font-medium">{r.deviceType}</Td>
                      <Td
                        className="max-w-[240px] truncate"
                        title={r.issue || ""}
                      >
                        {r.issue || "—"}
                      </Td>
                      <Td>{r.color || "—"}</Td>
                      <Td>{r?.technician?.name || "—"}</Td>
                      <Td>{depName}</Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <select
                            value={
                              SHORT_STATUS.includes(r.status) ? r.status : ""
                            }
                            onChange={(e) =>
                              changeStatusInline(r, e.target.value)
                            }
                            className="px-2 py-1 rounded-lg border w-[150px]"
                          >
                            <option value="">— اختر —</option>
                            {SHORT_STATUS.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>

                          {r.status === "مرفوض" && (
                            <select
                              value={r.rejectedDeviceLocation || "بالمحل"}
                              onChange={(e) =>
                                changeRejectedLocation(r, e.target.value)
                              }
                              className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-200 mt-1"
                              aria-label={`مكان الجهاز للصيانة رقم ${r.repairId}`}
                              title="مكان الجهاز عند الرفض"
                            >
                              <option value="بالمحل">بالمحل</option>
                              <option value="مع العميل">مع العميل</option>
                            </select>
                          )}
                        </div>
                      </Td>
                      <Td>{finalPrice ?? basePrice ?? "—"}</Td>
                      <Td>{formatDate(r.createdAt)}</Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/repairs/${r._id}`}
                            className={`${UI.btn} ${UI.btnGhost}`}
                          >
                            فتح
                          </Link>
                          {canEditAll && (
                            <Link
                              to={`/repairs/${r._id}/edit`}
                              className={`${UI.btn} bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200`}
                            >
                              تعديل
                            </Link>
                          )}
                          {canDeleteAll && (
                            <button
                              onClick={() => handleDelete(r)}
                              disabled={deletingId === r._id}
                              className={`${UI.btn} bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50`}
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
        </div>
      </section>

      {/* ===== الموبايل ===== */}
      <section className="md:hidden space-y-2">
        {loading ? (
          <div className={`${UI.card} p-4 animate-pulse h-24`} />
        ) : list.length === 0 ? (
          <EmptyState />
        ) : (
          list.map((r) => {
            const basePrice = hasNum(r.price) ? Number(r.price) : null;
            const finalPrice = hasNum(r.finalPrice)
              ? Number(r.finalPrice)
              : null;
            const priceLine = finalPrice ?? basePrice ?? "—";
            const hint =
              finalPrice !== null &&
              basePrice !== null &&
              finalPrice !== basePrice
                ? ` (مبدئي: ${basePrice})`
                : "";
            const depName =
              r.currentDepartment?.name ||
              depMap.get(String(r.currentDepartment || "")) ||
              "—";

            return (
              <div
                key={r._id}
                className={`${UI.card} p-3 shadow-sm ${
                  r.hasWarranty
                    ? "border-amber-300/60 bg-amber-50/40 dark:bg-amber-900/10"
                    : ""
                }`}
              >
                <div className="flex items-end justify-between flex-col">
                  <div className="font-bold flex items-center gap-2 whitespace-nowrap">
                    <span>
                      #{r.repairId} — {r.deviceType}
                    </span>
                    {r.hasWarranty && <WarrantyBadge until={r.warrantyEnd} />}
                  </div>
                  <StatusPill s={r.status} />
                </div>

                <div className="text-sm text-[16px] opacity-80">
                  {r.customerName} • {r.phone || "—"}
                </div>
                <div className="text-xs opacity-70 mt-1">
                  {r?.technician?.name
                    ? `الفني: ${r.technician.name}`
                    : "الفني: —"}{" "}
                  • القسم: {depName}
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                  <Info label="العطل" value={r.issue || "—"} />
                  <Info label="اللون" value={r.color || "—"} />
                  <Info label="السعر" value={`${priceLine}${hint}`} />
                  <Info label="إنشاء" value={formatDate(r.createdAt)} />
                  <Info
                    label="التسليم"
                    value={r.deliveryDate ? formatDate(r.deliveryDate) : "—"}
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="flex gap-2 items-center">
                    <select
                      value={SHORT_STATUS.includes(r.status) ? r.status : ""}
                      onChange={(e) => changeStatusInline(r, e.target.value)}
                      className="px-2 py-1 rounded-lg border"
                    >
                      <option value="" disabled>
                        — اختر —
                      </option>
                      {SHORT_STATUS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    {r.status === "مرفوض" && (
                      <select
                        value={r.rejectedDeviceLocation || "بالمحل"}
                        onChange={(e) =>
                          changeRejectedLocation(r, e.target.value)
                        }
                        className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-200"
                        aria-label="مكان الجهاز عند الرفض"
                      >
                        <option value="بالمحل">بالمحل</option>
                        <option value="مع العميل">مع العميل</option>
                      </select>
                    )}
                  </div>

                  <Link
                    to={`/repairs/${r._id}`}
                    className={`${UI.btn} ${UI.btnGhost}`}
                  >
                    فتح
                  </Link>
                  {canEditAll && (
                    <Link
                      to={`/repairs/${r._id}/edit`}
                      className={`${UI.btn} ${UI.btnPrimary}`}
                    >
                      تعديل
                    </Link>
                  )}
                  {canDeleteAll && (
                    <button
                      onClick={() => handleDelete(r)}
                      disabled={deletingId === r._id}
                      className={`${UI.btn} bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50`}
                      aria-label={`حذف الصيانة رقم ${r.repairId}`}
                      title="حذف"
                    >
                      {deletingId === r._id ? "جارٍ…" : "حذف"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
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
        initialFinalPrice={
          deliverTarget
            ? deliverTarget.finalPrice ?? deliverTarget.price ?? 0
            : 0
        }
        initialParts={deliverTarget ? deliverTarget.parts || [] : []}
        requirePassword={deliverRequirePassword}
      />

      {/* مودال تاريخ الضمان */}
      {showWarrantyModal && (
        <div className="fixed inset-0 grid place-items-center bg-black/40 z-50">
          <div
            className={`${UI.card} p-4 w-[380px] max-w-[92vw] space-y-3 shadow-xl`}
          >
            <h3 className="text-lg font-semibold">حدد تاريخ انتهاء الضمان</h3>
            <input
              type="date"
              className={UI.input}
              value={warrantyEnd}
              onChange={(e) => setWarrantyEnd(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                className={`${UI.btn} ${UI.btnGhost}`}
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 7);
                  setWarrantyEnd(d.toISOString().slice(0, 10));
                }}
              >
                أسبوع
              </button>
              <button
                className={`${UI.btn} ${UI.btnGhost}`}
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 30);
                  setWarrantyEnd(d.toISOString().slice(0, 10));
                }}
              >
                شهر
              </button>
              <button
                className={`${UI.btn} ${UI.btnGhost}`}
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 90);
                  setWarrantyEnd(d.toISOString().slice(0, 10));
                }}
              >
                3 شهور
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <button
                className={`${UI.btn} ${UI.btnGhost}`}
                onClick={() => {
                  setShowWarrantyModal(false);
                  setWarrantyTarget(null);
                  setWarrantyEnd("");
                }}
              >
                إلغاء
              </button>
              <button
                className={`${UI.btn} ${UI.btnPrimary}`}
                onClick={async () => {
                  if (!warrantyTarget || !warrantyEnd) return;
                  await setWarranty(warrantyTarget._id, {
                    hasWarranty: true,
                    warrantyEnd,
                  });
                  setShowWarrantyModal(false);
                  setWarrantyEnd("");

                  try {
                    const fresh = await API.get(
                      `/repairs/${warrantyTarget._id}`
                    ).then((r) => r.data);
                    setWarrantyTarget(null);
                    if (["مكتمل", "تم التسليم"].includes(fresh?.status)) {
                      setAfterCompleteTarget(fresh);
                      setAfterCompleteOpen(true);
                    }
                    await load();
                  } catch {
                    await load();
                  }
                }}
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {afterCompleteOpen && (
        <AfterCompleteModal
          open={afterCompleteOpen}
          onClose={() => setAfterCompleteOpen(false)}
          onPrint={() => HandlePrintReceipt(afterCompleteTarget)}
          onWhatsApp={() => HandleWhatsAppMessage(afterCompleteTarget)}
        />
      )}
    </div>
  );
}

/* ====== Sub Components ====== */
function KPI({ title, value, tone = "slate" }) {
  const toneMap = {
    slate: "bg-slate-50 dark:bg-slate-800/50",
    emerald: "bg-emerald-50 dark:bg-emerald-900/20",
    indigo: "bg-indigo-50 dark:bg-indigo-900/20",
    rose: "bg-rose-50 dark:bg-rose-900/20",
    amber: "bg-amber-50 dark:bg-amber-900/20",
  };
  return (
    <div
      className={`rounded-2xl px-4 py-3 ${toneMap[tone]} ${UI.card} border-0`}
    >
      <div className="text-xs opacity-70">{title}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}
function Th({ children }) {
  return (
    <th className="p-3 text-xs font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
      {children}
    </th>
  );
}
function Td({ children, className = "" }) {
  return <td className={`p-3 align-middle ${className}`}>{children}</td>;
}
function Info({ label, value }) {
  return (
    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
      <div className="text-[11px] opacity-70">{label}</div>
      <div className="font-medium break-words">{value}</div>
    </div>
  );
}
