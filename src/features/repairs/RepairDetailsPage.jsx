import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import useAuthStore from "../auth/authStore";
import { getRepair, updateRepair, updateRepairStatus, createCustomerUpdate, setWarranty } from "./repairsApi";
import API, { RepairsAPI, DepartmentsAPI } from "../../lib/api";
import QrAfterCreateModal from "../../components/QrAfterCreateModal";
import DeliveryModal from "../../components/DeliveryModal";
import { SHORT_STATUS, STATUS_AR, TYPE_AR, statusToSelectValue, selectValueToStatusPatch } from "../../utils/data";
import toNum from "../../components/helpers/toNum";
import numOrDash from "../../components/helpers/numOrDash";
import AfterCompleteModal from "../../components/AfterCompleteModal";
import { PALETTE, TYPE_STYLE } from "../../utils/ui";
import handlePrintReceipt from "../../components/helpers/handlePrintReceipt";
import handleWhatsAppMessage from "../../components/helpers/handleWhatsAppMessage";
import LogRow from "../../components/LogRow";
import { describeLog } from "../../components/helpers/describeLog";

export default function SingleRepairPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin" || user?.permissions?.adminOverride;
  const canEditAll = isAdmin || user?.permissions?.editRepair;

  const [loading, setLoading] = useState(true);
  const [savingBtn, setSavingBtn] = useState(false);
  const [repair, setRepair] = useState(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [requirePassword, setRequirePassword] = useState(false);
  const [afterCompleteOpen, setAfterCompleteOpen] = useState(false);
  const [warrantyEnd, setWarrantyEnd] = useState("");
  const [showWarrantyModal, setShowWarrantyModal] = useState(false);

  const [info, setInfo] = useState({
    currentDepartment: null,
    flows: [],
    logs: [],
    departmentPriceTotal: 0,
    acl: { canAssignTech: false, canCompleteCurrent: false, canMoveNext: false },
  });
  const [deps, setDeps] = useState([]);
  const [techs, setTechs] = useState([]);
  const [nextDept, setNextDept] = useState("");
  const [assignTechId, setAssignTechId] = useState("");
  const [stepPrice, setStepPrice] = useState("");
  const [stepNotes, setStepNotes] = useState("");

  const [cuType, setCuType] = useState("text");
  const [cuText, setCuText] = useState("");
  const [cuFileUrl, setCuFileUrl] = useState("");
  const [cuSending, setCuSending] = useState(false);
  const [error, setError] = useState("");

  const trackingUrl = useMemo(() => {
    const token = repair?.publicTracking?.token;
    return token ? `${window.location.origin}/t/${token}` : "";
  }, [repair]);

  const isAssigned = useMemo(() => {
    if (!repair) return false;
    const techId = repair?.technician?._id || repair?.technician;
    const uid = user?.id || user?._id;
    return techId && uid && String(techId) === String(uid);
  }, [repair, user]);

  const finalStatusMeta = useMemo(() => {
    const logs = Array.isArray(info.logs) ? info.logs : [];
    const finalSet = new Set(["تم التسليم", "مكتمل", "مرفوض"]);

    const sorted = [...logs].sort((a, b) => new Date(b?.at || b?.createdAt || 0) - new Date(a?.at || a?.createdAt || 0));

    if (repair?.status && finalSet.has(repair.status)) {
      const lg = sorted.find((l) => l?.type === "status_change" && l?.payload?.status === repair.status);
      if (lg) {
        return {
          status: lg.payload?.status,
          by: userLabel(lg.byUser) || (lg.by ? String(lg.by) : "—"),
          at: lg.at || lg.createdAt || null,
        };
      }
    }

    const lastAnyFinal = sorted.find((l) => l?.type === "status_change" && finalSet.has(l?.payload?.status));
    if (!lastAnyFinal) return null;

    return {
      status: lastAnyFinal.payload?.status,
      by: userLabel(lastAnyFinal.byUser) || (lastAnyFinal.by ? String(lastAnyFinal.by) : "—"),
      at: lastAnyFinal.at || lastAnyFinal.createdAt || null,
    };
  }, [info.logs, repair?.status]);

  async function loadRepairBase() {
    try {
      setLoading(true);
      const r = await getRepair(id);
      const unified = { ...r, price: toNum(r.price) ?? r.price, finalPrice: toNum(r.finalPrice) ?? r.finalPrice };
      setRepair(unified);
      setError("");
    } catch (e) {
      setError(e?.response?.data?.message || "حدث خطأ أثناء التحميل");
    } finally {
      setLoading(false);
    }
  }

  async function loadTimeline() {
    try {
      const t = await RepairsAPI.timeline(id);
      setInfo(t);
      if (t?.currentDepartment?._id) {
        const r = await API.get(`/technicians?department=${t.currentDepartment._id}`);
        setTechs(r.data || []);
      } else {
        setTechs([]);
      }
    } catch (e) {
      console.error(e);
      setInfo({
        currentDepartment: null,
        flows: [],
        logs: [],
        departmentPriceTotal: 0,
        acl: { canAssignTech: false, canCompleteCurrent: false, canMoveNext: false },
      });
      setTechs([]);
    }
  }

  useEffect(() => {
    (async () => {
      await loadRepairBase();
      await loadTimeline();
      const d = await DepartmentsAPI.list();
      setDeps(d);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const h = async () => {
      await loadRepairBase();
      await loadTimeline();
    };
    window.addEventListener("repairs:refresh", h);
    return () => window.removeEventListener("repairs:refresh", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleStatusPick(nextValue) {
    if (!repair) return;
    if (!nextValue) return;

    const patch = selectValueToStatusPatch(nextValue);

    if (patch.status === "تم التسليم") {
      setRequirePassword(!canEditAll && isAssigned);
      setDeliverOpen(true);
      return;
    }

    const body = { status: patch.status };
    if (patch.status === "مرفوض" && patch.rejectedDeviceLocation) {
      body.rejectedDeviceLocation = patch.rejectedDeviceLocation;
    }

    if (!canEditAll && isAssigned) {
      const password = window.prompt("ادخل كلمة السر لتأكيد تغيير الحالة");
      if (!password) return;
      body.password = password;
    }

    changeStatus(body);
  }

  async function changeStatus(body) {
    if (!repair) return;
    try {
      setSavingBtn(true);
      const updated = await updateRepairStatus(id, body);
      const norm = { ...updated, price: toNum(updated.price) ?? updated.price, finalPrice: toNum(updated.finalPrice) ?? updated.finalPrice };
      setRepair(norm);

      await loadTimeline();

      if (body?.status === "مكتمل" || body?.status === "تم التسليم") {
        if (norm?.hasWarranty === true && !norm?.warrantyEnd) {
          setShowWarrantyModal(true);
        } else if (norm?.hasWarranty === true && norm?.warrantyEnd) {
          setAfterCompleteOpen(true);
        }
      }
    } catch (e) {
      alert(e?.response?.data?.message || "فشل تغيير الحالة");
    } finally {
      setSavingBtn(false);
    }
  }

  async function submitDelivery(payload) {
    try {
      const parts = (payload.parts || []).map((p) => ({
        name: p.name || "",
        cost: p.cost ? Number(p.cost) : 0,
        supplier: p.supplier || undefined,
        source: p.source || undefined,
        purchaseDate: p.purchaseDate ? new Date(p.purchaseDate).toISOString() : undefined,
      }));

      const body = {
        status: "تم التسليم",
        parts,
        ...(payload.password ? { password: payload.password } : {}),
        ...(payload.finalPrice !== "" && payload.finalPrice != null ? { finalPrice: Number(payload.finalPrice) } : {}),
        ...(payload.price !== "" && payload.price != null ? { price: Number(payload.price) } : {}),
      };

      const updated = await updateRepair(id, body);
      const norm = { ...updated, price: toNum(updated.price) ?? updated.price, finalPrice: toNum(updated.finalPrice) ?? updated.finalPrice };

      setRepair(norm);
      setDeliverOpen(false);

      await loadTimeline();

      if (norm?.hasWarranty === true && !norm?.warrantyEnd) {
        setShowWarrantyModal(true);
      } else if (norm?.hasWarranty === true && norm?.warrantyEnd) {
        setAfterCompleteOpen(true);
      }
    } catch (e) {
      alert(e?.response?.data?.message || "خطأ أثناء إتمام التسليم");
    }
  }

  if (loading) return <div>جارِ التحميل...</div>;
  if (error) return <div className="p-3 rounded-xl bg-red-50 text-red-800">{error}</div>;
  if (!repair) return <div>الصيانة غير موجودة.</div>;

  const cur = info.flows?.length ? info.flows[info.flows.length - 1] : null;
  const isCurrentCompleted = cur && cur.status === "completed";

  const CARD =
    (typeof PALETTE !== "undefined" && PALETTE.card) ||
    "bg-white/90 dark:bg-zinc-900/90 border border-slate-200 dark:border-slate-800";
  const SUBTLE =
    (typeof PALETTE !== "undefined" && PALETTE.subtle) ||
    "bg-slate-50 dark:bg-slate-800/60";

  const parts = repair.parts || [];
  const logsCount = (info.logs || []).length;
  const stepsCount = (info.flows || []).length;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl overflow-hidden">
        <div className="bg-gradient-to-l from-fuchsia-600 via-violet-600 to-indigo-700 text-white p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">صيانة #{repair.repairId ?? "—"}</h1>
              <p className="opacity-90 mt-1">تابع الحالة والخطوات وأرسل تحديثات للعميل بسهولة.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const token = repair?.publicTracking?.token;
                  const url = token ? `${window.location.origin}/t/${token}` : "";
                  if (!url) {
                    alert("لم يتم تفعيل التتبّع بعد.");
                    return;
                  }
                  setQrOpen(true);
                }}
                className="px-3 py-2 rounded-xl bg-white/90 text-indigo-700 hover:opacity-90"
              >
                تتبُّع/QR
              </button>

              {(isAdmin || user?.permissions?.editRepair) && (
                <Link to={`/repairs/${id}/edit`} className="px-3 py-2 rounded-xl bg-white/90 text-indigo-700 hover:opacity-90">
                  تعديل
                </Link>
              )}

              <Link to="/repairs" className="px-3 py-2 rounded-xl bg-white/20">
                رجوع
              </Link>
            </div>
          </div>
        </div>
      </div>

      <section className={`p-4 md:p-5 rounded-2xl ${CARD}`}>
        <div className="grid md:grid-cols-5 gap-3 items-end">
          <div>
            <div className="text-sm text-[16px] opacity-80 mb-1">الحالة</div>
            <select
              value={statusToSelectValue(repair)}
              onChange={(e) => handleStatusPick(e.target.value)}
              disabled={savingBtn || (!canEditAll && !isAssigned)}
              className="px-3 py-2 rounded-xl border w-full"
            >
              <option value="">اختر حالة</option>
              {SHORT_STATUS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {!canEditAll && isAssigned && <div className="text-xs opacity-70 mt-1">عند اختيار “تم التسليم” سيُطلب كلمة السر.</div>}
          </div>

          <Info label="القسم الحالي" value={info.currentDepartment?.name || "—"} />
          <Info label="تاريخ الإنشاء" value={formatDate(repair.createdAt)} />
          <Info label="تم الاستلام بواسطة" value={repair?.createdBy?.name || "—"} />

          {finalStatusMeta ? <Info label="آخر تغيير للحالة بواسطة " value={finalStatusMeta.by || "—"} /> : null}
        </div>
      </section>

      <section className={`p-4 md:p-5 rounded-2xl ${CARD}`}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-indigo-500" />
            <span>الخطوات (التايملاين)</span>
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
            {stepsCount} خطوة
          </span>
        </div>

        {stepsCount === 0 ? (
          <div className="opacity-70 text-sm">
            لا توجد خطوات بعد. عيّن قسمًا من شاشة التعديل أو انقل الصيانة لقسم
            من الأسفل.
          </div>
        ) : (
          <div className="space-y-4">
            {info.flows.map((f, index) => {
              const isLast = index === info.flows.length - 1;
              const isCurrent =
                info.currentDepartment &&
                f.department &&
                String(info.currentDepartment._id) === String(f.department._id);
              const isCompleted = f.status === "completed";

              const dotCls = isCurrent
                ? "bg-indigo-500 ring-4 ring-indigo-200 dark:ring-indigo-800"
                : isCompleted
                ? "bg-emerald-500"
                : "bg-slate-400";

              const cardCls = isCurrent
                ? "border-indigo-200/80 bg-indigo-50/70 dark:bg-indigo-950/40 dark:border-indigo-700"
                : isCompleted
                ? "border-emerald-200/80 bg-emerald-50/60 dark:bg-emerald-950/30 dark:border-emerald-700"
                : "border-slate-200 bg-slate-50 dark:bg-slate-900/40 dark:border-slate-700";

              return (
                <div key={f._id} className="flex gap-3">
                  <div className="flex flex-col items-center pt-1">
                    <span
                      className={`w-3 h-3 rounded-full ${dotCls}`}
                      aria-hidden
                    />
                    {!isLast && (
                      <span className="flex-1 w-px bg-slate-300 dark:bg-slate-700 mt-1" />
                    )}
                  </div>

                  <article
                    className={`flex-1 p-3 rounded-2xl border text-sm text-[16px] shadow-[0_4px_10px_rgba(15,23,42,0.04)] ${cardCls}`}
                  >
                    <header className="flex items-center justify-between gap-2 mb-1">
                      <div className="font-semibold">
                        {index + 1}. {f.department?.name || "قسم"}
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/70 dark:bg-black/20 border border-white/50 dark:border-slate-600">
                        {STATUS_AR[f.status] || f.status}
                      </span>
                    </header>

                    <div className="text-xs md:text-sm text-[16px] mt-1">
                      فنّي:{" "}
                      <b>
                        {f.technician
                          ? f.technician.name ||
                            f.technician.username ||
                            f.technician.email
                          : "غير معيّن"}
                      </b>
                      {" · "}
                      السعر: <b>{Number(f.price || 0).toFixed(2)} ج.م</b>
                    </div>

                    <div className="text-[11px] opacity-70 mt-1 space-y-0.5">
                      <div>
                        بدأ:{" "}
                        {f.startedAt
                          ? new Date(f.startedAt).toLocaleString("ar-EG")
                          : "-"}
                      </div>
                      <div>
                        اكتمل:{" "}
                        {f.completedAt
                          ? new Date(f.completedAt).toLocaleString("ar-EG")
                          : "-"}
                      </div>
                    </div>

                    {f.notes && (
                      <div className="text-xs md:text-sm text-[16px] mt-1">
                        ملاحظات: {f.notes}
                      </div>
                    )}

                    {isCurrent && (
                      <div className="mt-2 text-[11px] text-indigo-700 dark:text-indigo-200">
                        هذه هي الخطوة الحالية.
                      </div>
                    )}
                  </article>
                </div>
              );
            })}

            <div className="mt-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm text-[16px] border border-slate-200/70 dark:border-slate-700">
              إجمالي تسعير الأقسام:{" "}
              <b>{Number(info.departmentPriceTotal || 0).toFixed(2)} ج.م</b>
            </div>
          </div>
        )}
      </section>

      <section className={`p-4 md:p-5 rounded-2xl ${CARD}`}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-indigo-500" />
            <span>الخطوة الحالية</span>
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
            القسم الحالي: {info.currentDepartment?.name || "—"}
          </span>
        </div>
        <p className="text-sm text-[16px] opacity-75 mb-4">
          من هنا تقدر تعيّن فنّي للقسم الحالي، تسعّر الخطوة وتعلّمها مكتملة، أو
          تنقل الصيانة لقسم آخر.
        </p>

        <div className="grid gap-3 lg:grid-cols-3">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm text-[16px] font-semibold">
                تعيين الفنّي
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                بدء / تغيير الفني
              </span>
            </div>
            <p className="text-xs opacity-70">
              اختر فنّي من نفس القسم الحالي لتربطه بالخطوة.
            </p>
            <select
              className="border rounded-lg px-3 py-2 text-sm text-[16px] mt-1"
              value={assignTechId}
              onChange={(e) => setAssignTechId(e.target.value)}
              disabled={
                savingBtn || !info.acl?.canAssignTech || !info.currentDepartment
              }
            >
              <option value="">— اختر فنّيًا —</option>
              {techs.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name || t.username || t.email}
                </option>
              ))}
            </select>
            <ActionButton
              onClick={async () => {
                if (!assignTechId) return;
                try {
                  await RepairsAPI.assignTech(id, {
                    technicianId: assignTechId,
                  });
                  setAssignTechId("");
                  await loadTimeline();
                } catch (e) {
                  alert(e?.response?.data?.error || "غير مسموح بتعيين الفني");
                }
              }}
              disabled={savingBtn || !info.acl?.canAssignTech}
            >
              تعيين الفنّي / بدء العمل
            </ActionButton>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm text-[16px] font-semibold">
                تسعير الخطوة
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200">
                تعليم كمكتمل
              </span>
            </div>
            <p className="text-xs opacity-70">
              ضع سعر القسم وملاحظة مختصرة ثم علّم الخطوة كمكتملة.
            </p>

            <div className="flex flex-col gap-2 mt-1">
              <div>
                <label className="block text-xs mb-1">سعر القسم</label>
                <input
                  type="number"
                  step="0.01"
                  className="border rounded-lg px-3 py-2 w-full text-sm"
                  value={stepPrice}
                  onChange={(e) => setStepPrice(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs mb-1">ملاحظات (اختياري)</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={stepNotes}
                  onChange={(e) => setStepNotes(e.target.value)}
                />
              </div>
            </div>

            <ActionButton
              onClick={async () => {
                try {
                  await RepairsAPI.completeStep(id, {
                    price: Number(stepPrice || 0),
                    notes: stepNotes,
                  });
                  setStepPrice("");
                  setStepNotes("");
                  await loadTimeline();
                } catch (e) {
                  alert(e?.response?.data?.error || "غير مسموح بإكمال الخطوة");
                }
              }}
              disabled={
                savingBtn ||
                !info.acl?.canCompleteCurrent ||
                !cur ||
                cur.status === "completed"
              }
            >
              تعليم الخطوة كمكتملة + حفظ السعر
            </ActionButton>

            {cur && cur.status === "completed" && (
              <div className="text-[11px] opacity-70">
                هذه الخطوة معلّمة بالفعل كمكتملة.
              </div>
            )}
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm text-[16px] font-semibold">
                نقل للقسم التالي
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-200">
                الخطوة التالية
              </span>
            </div>
            <p className="text-xs opacity-70">
              اختر القسم الذي ستنتقل إليه الصيانة بعد اكتمال الخطوة الحالية.
            </p>

            <select
              className="border rounded-lg px-3 py-2 text-sm text-[16px] mt-1"
              value={nextDept}
              onChange={(e) => setNextDept(e.target.value)}
            >
              <option value="">— اختر القسم التالي —</option>
              {deps.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>

            <ActionButton
              onClick={async () => {
                if (!nextDept) return;
                try {
                  await RepairsAPI.moveNext(id, { departmentId: nextDept });
                  setNextDept("");
                  await loadTimeline();
                } catch (e) {
                  alert(
                    e?.response?.data?.error ||
                      "غير مسموح بالنقل للخطوة التالية"
                  );
                }
              }}
              disabled={
                savingBtn ||
                !info.acl?.canMoveNext ||
                (!isCurrentCompleted && info.flows?.length > 0)
              }
            >
              نقل الصيانة للقسم التالي
            </ActionButton>

            {!isCurrentCompleted && info.flows?.length > 0 && (
              <div className="text-[11px] opacity-70">
                لا يمكن النقل إلا بعد تعليم الخطوة الحالية كمكتملة.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className={`p-4 md:p-5 rounded-2xl ${CARD}`}>
        <h3 className="text-lg font-semibold mb-3">البيانات الأساسية</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Info label="العميل" value={repair.customerName || "—"} />
          <Info label="الهاتف" value={repair.phone || "—"} />
          <Info label="الجهاز" value={repair.deviceType || "—"} />
          <Info label="اللون" value={repair.color || "—"} />
          <Info label="العطل" value={repair.issue || "—"} />
          <Info label="السعر المتفق عليه" value={numOrDash(repair.price)} />
          <Info label="السعر النهائي" value={numOrDash(repair.finalPrice)} />
          <Info label="ملاحظات" value={repair.notes || "—"} />
        </div>
      </section>

      <section className={`p-4 md:p-5 rounded-2xl ${CARD}`}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-indigo-500" />
            <span>قطع الغيار المستخدمة</span>
          </h3>
          {parts.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
              {parts.length} قطعة
            </span>
          )}
        </div>

        {parts.length === 0 ? (
          <div className="text-sm text-[16px] opacity-70">
            لا توجد قطع مسجّلة لهذه الصيانة.
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-[760px] w-full text-sm text-[16px] text-right">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-right">
                    <th className="py-2 px-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      اسم القطعة
                    </th>
                    <th className="py-2 px-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      التكلفة
                    </th>
                    <th className="py-2 px-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      المورد
                    </th>
                    <th className="py-2 px-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      بواسطة
                    </th>
                    <th className="py-2 px-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      تاريخ الشراء
                    </th>
                    <th className="py-2 px-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      حالة الدفع
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {parts.map((p, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-slate-100 dark:border-slate-800/60"
                    >
                      <td className="py-2 px-2">
                        {p.name || p.itemName || `قطعة ${idx + 1}`}
                      </td>
                      <td className="py-2 px-2">{numOrDash(p.cost)}</td>
                      <td className="py-2 px-2">{p.supplier || "—"}</td>
                      <td className="py-2 px-2">{p.source || "—"}</td>
                      <td className="py-2 px-2">
                        {p.purchaseDate ? formatDate(p.purchaseDate) : "—"}
                      </td>
                      <td className="py-2 px-2">
                        {p.paid ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
                            مدفوعة
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                            غير مدفوعة
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden grid gap-2">
              {parts.map((p, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-sm">
                      {p.name || p.itemName || `قطعة ${idx + 1}`}
                    </div>
                    <div className="text-xs font-medium">
                      {numOrDash(p.cost)} ج.م
                    </div>
                  </div>
                  <div className="text-xs opacity-75 mt-1">
                    المورد: <b>{p.supplier || "—"}</b>
                  </div>
                  <div className="text-xs opacity-75">
                    بواسطة: <b>{p.source || "—"}</b>
                  </div>
                  <div className="text-xs opacity-75">
                    تاريخ الشراء:{" "}
                    <b>{p.purchaseDate ? formatDate(p.purchaseDate) : "—"}</b>
                  </div>
                  <div className="mt-1">
                    {p.paid ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
                        مدفوعة
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                        غير مدفوعة
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className={`p-4 md:p-5 rounded-2xl ${CARD}`}>
        <div className="font-semibold mb-2">إرسال تحديث للعميل</div>
        <div className="grid gap-2">
          <label className="text-sm">النوع</label>
          <select
            className="border p-2 rounded-xl"
            value={cuType}
            onChange={(e) => setCuType(e.target.value)}
          >
            <option value="text">نصي</option>
            <option value="image">صورة (رابط)</option>
            <option value="video">فيديو (رابط)</option>
            <option value="audio">صوت (رابط)</option>
          </select>

          {cuType === "text" ? (
            <textarea
              className="border p-2 rounded-xl"
              placeholder="ما الذي تم فعله؟"
              value={cuText}
              onChange={(e) => setCuText(e.target.value)}
            />
          ) : (
            <input
              className="border p-2 rounded-xl"
              placeholder="ضع رابط الملف"
              value={cuFileUrl}
              onChange={(e) => setCuFileUrl(e.target.value)}
            />
          )}

          <div className="flex justify-end">
            <button
              disabled={cuSending}
              className={`px-4 py-2 rounded-xl ${PALETTE.primary} disabled:opacity-50`}
              onClick={async () => {
                setCuSending(true);
                try {
                  await createCustomerUpdate(repair._id, {
                    type: cuType,
                    text: cuText,
                    fileUrl: cuFileUrl,
                  });
                  alert("تم الإرسال للعميل");
                  setCuText("");
                  setCuFileUrl("");
                  await loadTimeline();
                } catch (e) {
                  console.log(e.message);
                } finally {
                  setCuSending(false);
                }
              }}
            >
              إرسال
            </button>
          </div>
        </div>
      </section>

      <section dir="rtl" className={`p-4 md:p-5 rounded-2xl ${CARD} shadow-sm`}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="font-semibold text-base md:text-lg flex items-center gap-2">
            <span
              className="inline-flex w-2 h-2 rounded-full bg-indigo-500"
              aria-hidden
            />
            سجل الحركات
          </h3>
          <span className="text-xs md:text-sm text-[16px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
            {logsCount} حدث
          </span>
        </div>

        <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="min-w-[760px] w-full text-sm">
            <thead className="sticky top-0 bg-white/90 dark:bg-zinc-900/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-zinc-900/70">
              <tr className="border-b border-slate-200 dark:border-slate-800 text-right">
                <th className="py-2.5 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  الوقت
                </th>
                <th className="py-2.5 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  النوع
                </th>
                <th className="py-2.5 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  التفاصيل
                </th>
              </tr>
            </thead>
            <tbody>
              {logsCount === 0 ? (
                <tr>
                  <td colSpan={3} className="py-6 px-3 text-center opacity-70">
                    لا يوجد سجل.
                  </td>
                </tr>
              ) : (
                info.logs.map((lg, i) => (
                  <tr
                    key={i}
                    className="odd:bg-slate-50/60 dark:odd:bg-zinc-800/40 hover:bg-slate-100/60 dark:hover:bg-zinc-800/60 transition-colors border-b border-slate-200/70 dark:border-slate-800/70 align-top"
                  >
                    <td className="py-2.5 px-3 align-middle whitespace-nowrap text-[13px] opacity-80">
                      {new Date(
                        lg.at || lg.createdAt || Date.now()
                      ).toLocaleString("ar-EG")}
                    </td>
                    <td className="py-2.5 px-3 align-middle">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          TYPE_STYLE[lg.type] ||
                          "bg-slate-100 text-slate-800 dark:bg-slate-700"
                        }`}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-current opacity-70"
                          aria-hidden
                        />
                        {TYPE_AR?.[lg.type] || lg.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="text-[12px] opacity-75 mb-1">
                        بواسطة: <b>{userLabel(lg.byUser) || "—"}</b>
                      </div>
                      <LogRow log={lg} deps={deps} flows={info.flows} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden grid gap-2">
          {logsCount === 0 ? (
            <div className="opacity-70">لا يوجد سجل.</div>
          ) : (
            info.logs.map((lg, i) => {
              const { summary, details } = describeLog(lg, {
                deps,
                flows: info.flows,
              });
              const timeTxt = new Date(
                lg.at || lg.createdAt || Date.now()
              ).toLocaleString("ar-EG");
              const pill =
                TYPE_STYLE[lg.type] ||
                "bg-slate-100 text-slate-800 dark:bg-slate-700";
              return (
                <article
                  key={i}
                  className={`p-3 rounded-2xl ${SUBTLE} border border-slate-200/80 dark:border-slate-700 shadow-xs`}
                  aria-label={`حدث: ${TYPE_AR?.[lg.type] || lg.type}`}
                >
                  <header className="flex items-center justify-between gap-2">
                    <time
                      dateTime={lg.at || lg.createdAt}
                      className="text-[11px] opacity-70"
                    >
                      {timeTxt}
                    </time>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${pill}`}
                    >
                      {TYPE_AR?.[lg.type] || lg.type}
                    </span>
                  </header>

                  <div className="text-[11px] opacity-75 mt-1">
                    بواسطة: <b>{userLabel(lg.byUser) || "—"}</b>
                  </div>

                  <h4 className="text-sm text-[16px] mt-2 font-semibold">
                    {summary}
                  </h4>

                  {Array.isArray(details) && details.length > 0 && (
                    <ul className="list-disc pr-5 mt-1 space-y-1 text-[13px] leading-5">
                      {details.map((d, j) => (
                        <li key={j}>{d}</li>
                      ))}
                    </ul>
                  )}
                </article>
              );
            })
          )}
        </div>
      </section>

          <QrAfterCreateModal open={qrOpen} onClose={() => setQrOpen(false)} trackingUrl={trackingUrl} repair={repair} />

      <DeliveryModal
        open={deliverOpen}
        onClose={() => setDeliverOpen(false)}
        onSubmit={submitDelivery}
        initialFinalPrice={repair.finalPrice ?? repair.price ?? 0}
        initialParts={repair.parts || []}
        requirePassword={requirePassword}
      />

      {showWarrantyModal && (
        <div className="fixed inset-0 grid place-items-center bg-black/40 z-50">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl w-[380px] space-y-3">
            <h3 className="text-lg font-semibold">حدد تاريخ انتهاء الضمان</h3>
            <input type="date" className="border p-2 w-full rounded-xl" value={warrantyEnd} onChange={(e) => setWarrantyEnd(e.target.value)} />
            <div className="flex gap-2">
              <button className="px-2 py-1 rounded-xl border" onClick={() => setWarrantyEnd(addDays(7))}>
                أسبوع
              </button>
              <button className="px-2 py-1 rounded-xl border" onClick={() => setWarrantyEnd(addDays(30))}>
                شهر
              </button>
              <button className="px-2 py-1 rounded-xl border" onClick={() => setWarrantyEnd(addDays(90))}>
                3 شهور
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-2 rounded-xl border" onClick={() => setShowWarrantyModal(false)}>
                إلغاء
              </button>
              <button
                className={`px-3 py-2 rounded-xl ${PALETTE.primary}`}
                onClick={async () => {
                  if (!warrantyEnd) return;
                  await setWarranty(repair._id, { hasWarranty: true, warrantyEnd });
                  setShowWarrantyModal(false);
                  const r = await getRepair(id);
                  setRepair({ ...r, price: toNum(r.price) ?? r.price, finalPrice: toNum(r.finalPrice) ?? r.finalPrice });
                  await loadTimeline();
                  if (["مكتمل", "تم التسليم"].includes(r?.status)) setAfterCompleteOpen(true);
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
          onPrint={() => handlePrintReceipt(repair)}
          onWhatsApp={() => handleWhatsAppMessage(repair)}
          hasWarranty={!!(repair?.hasWarranty && repair?.warrantyEnd)}
        />
      )}

      <style>{`.inp{padding:.6rem .8rem;border-radius:.9rem;background:var(--inp-bg,#f3f4f6)}`}</style>
    </div>
  );
}

function ActionButton({ children, onClick, disabled }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className={`px-3 py-2 rounded-lg ${PALETTE.outline} disabled:opacity-50`}
      disabled={disabled || busy}
      onClick={async () => {
        try {
          setBusy(true);
          await onClick?.();
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "جارٍ التنفيذ..." : children}
    </button>
  );
}

function Info({ label, value, children }) {
  const v = value ?? children ?? "—";
  return (
    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
      <div className="text-xs opacity-70">{label}</div>
      <div className="font-semibold break-words">{v}</div>
    </div>
  );
}

function userLabel(u) {
  if (!u) return "";
  return u.name || u.username || u.email || "";
}

function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("ar-EG");
  } catch {
    return "—";
  }
}