import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import useAuthStore from "../auth/authStore";
import {
  getRepair,
  updateRepair,
  updateRepairStatus,
  createCustomerUpdate,
  setWarranty,
} from "./repairsApi";
import API, { RepairsAPI, DepartmentsAPI } from "../../lib/api";
import QrAfterCreateModal from "../../components/QrAfterCreateModal";
import DeliveryModal from "../../components/DeliveryModal";

/* ========= Theme / Palette ========= */
const PALETTE = {
  card: "bg-white/90 dark:bg-[#1c273fe6] border border-slate-200 dark:border-slate-800 backdrop-blur",
  subtle: "bg-slate-50 dark:bg-slate-800/70",
  primary:
    "bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 text-white",
  outline:
    "border border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800",
  danger: "bg-rose-600 hover:bg-rose-700 text-white",
  ok: "bg-emerald-600 hover:bg-emerald-700 text-white",
  grayBtn: "bg-gray-200 dark:bg-gray-700",
};

/* ========= Helpers ========= */
function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function numOrDash(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : "—";
}
function priceDisplay(finalPrice, price) {
  const fn = Number(finalPrice);
  if (Number.isFinite(fn)) return fn;
  const pn = Number(price);
  return Number.isFinite(pn) ? pn : "—";
}

const STATUS_SELECT = ["مكتمل", "تم التسليم", "مرفوض"];

const SHOP = {
  name: "IGenius",
  phone: "01000000000",
  address: "القاهرة — شارع المثال، عمارة 10",
  footer: "شكراً لاختياركم خدماتنا.",
  warrantyNote:
    "الضمان يشمل العطل المُصلّح فقط ولا يشمل سوء الاستخدام أو الكسر أو السوائل.",
};

export default function SingleRepairPage() {
  const { id } = useParams();
  const nav = useNavigate();
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

  // التايملاين / الأقسام / الفنيين للخطوة الحالية
  const [info, setInfo] = useState({
    currentDepartment: null,
    flows: [],
    logs: [],
    departmentPriceTotal: 0,
    acl: {
      canAssignTech: false,
      canCompleteCurrent: false,
      canMoveNext: false,
    },
  });
  const [deps, setDeps] = useState([]);
  const [techs, setTechs] = useState([]);
  const [nextDept, setNextDept] = useState("");
  const [assignTechId, setAssignTechId] = useState("");
  const [stepPrice, setStepPrice] = useState("");
  const [stepNotes, setStepNotes] = useState("");

  // إرسال تحديثات للعميل
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

  async function loadRepairBase() {
    try {
      setLoading(true);
      const r = await getRepair(id);
      const unified = {
        ...r,
        price: toNum(r.price) ?? r.price,
        finalPrice: toNum(r.finalPrice) ?? r.finalPrice,
      };
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
        const r = await API.get(
          `/technicians?department=${t.currentDepartment._id}`
        );
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
        acl: {
          canAssignTech: false,
          canCompleteCurrent: false,
          canMoveNext: false,
        },
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
  }, []);

  function handleStatusPick(nextStatus) {
    if (!repair) return;

    if (nextStatus === "تم التسليم") {
      setRequirePassword(!canEditAll && isAssigned);
      setDeliverOpen(true);
      return;
    }

    const body = { status: nextStatus };
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
      const norm = {
        ...updated,
        price: toNum(updated.price) ?? updated.price,
        finalPrice: toNum(updated.finalPrice) ?? updated.finalPrice,
      };
      setRepair(norm);

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

  async function changeRejectedLocation(loc) {
    try {
      const body = { status: "مرفوض", rejectedDeviceLocation: loc };
      if (!canEditAll && isAssigned) {
        const password = window.prompt(
          "ادخل كلمة السر لتأكيد تغيير مكان الجهاز"
        );
        if (!password) return;
        body.password = password;
      }
      const updated = await updateRepairStatus(id, body);
      setRepair({
        ...updated,
        price: toNum(updated.price) ?? updated.price,
        finalPrice: toNum(updated.finalPrice) ?? updated.finalPrice,
      });
    } catch (e) {
      alert(e?.response?.data?.message || "فشل تحديث مكان الجهاز");
    }
  }

  async function submitDelivery(payload) {
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
      const body = {
        status: "تم التسليم",
        parts,
        ...(payload.password ? { password: payload.password } : {}),
        ...(payload.finalPrice !== "" && payload.finalPrice != null
          ? { finalPrice: Number(payload.finalPrice) }
          : {}),
        ...(payload.price !== "" && payload.price != null
          ? { price: Number(payload.price) }
          : {}),
      };
      const updated = await updateRepair(id, body);
      const norm = {
        ...updated,
        price: toNum(updated.price) ?? updated.price,
        finalPrice: toNum(updated.finalPrice) ?? updated.finalPrice,
      };
      setRepair(norm);
      setDeliverOpen(false);

      if (norm?.hasWarranty === true && !norm?.warrantyEnd) {
        setShowWarrantyModal(true);
      } else if (norm?.hasWarranty === true && norm?.warrantyEnd) {
        setAfterCompleteOpen(true);
      }
    } catch (e) {
      alert(e?.response?.data?.message || "خطأ أثناء إتمام التسليم");
    }
  }

  function handlePrintReceipt() {
    if (!repair) return;
    const win = window.open("", "_blank", "width=800,height=900");
    const warrantyTxt =
      repair?.hasWarranty && repair?.warrantyEnd
        ? `ضمان حتى: ${formatDate(repair.warrantyEnd)}`
        : "— لا يوجد تاريخ ضمان محدد —";

    const html = `
<!doctype html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8"/>
<title>إيصال ضمان — #${repair.repairId ?? "-"}</title>
<style>
  body{font-family:Tahoma,Arial,sans-serif; margin:24px; color:#111;}
  .hdr{display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #000; padding-bottom:10px; margin-bottom:16px;}
  .shop h1{margin:0; font-size:20px}
  .shop div{font-size:12px; opacity:.8}
  .meta{font-size:12px; text-align:left}
  h2{font-size:16px; margin:16px 0 8px}
  table{width:100%; border-collapse:collapse}
  th,td{border:1px solid #ddd; padding:8px; font-size:13px}
  .note{margin-top:12px; font-size:12px; opacity:.8}
  .footer{margin-top:18px; font-size:12px; text-align:center}
  .badge{display:inline-block; padding:2px 8px; border-radius:8px; background:#f5f5f5; font-size:12px}
</style>
</head>
<body>
  <div class="hdr">
    <div class="shop">
      <h1>${SHOP.name}</h1>
      <div>الهاتف: ${SHOP.phone}</div>
      <div>العنوان: ${SHOP.address}</div>
    </div>
    <div class="meta">
      <div>رقم الصيانة: #${repair.repairId ?? "-"}</div>
      <div>التاريخ: ${formatDate(new Date().toISOString())}</div>
      <div class="badge">${repair.status || ""}</div>
    </div>
  </div>

  <h2>بيانات العميل</h2>
  <table>
    <tr><th>الاسم</th><td>${repair.customerName || "—"}</td></tr>
    <tr><th>الهاتف</th><td>${repair.phone || "—"}</td></tr>
  </table>

  <h2>بيانات الجهاز</h2>
  <table>
    <tr><th>النوع</th><td>${repair.deviceType || "—"}</td></tr>
    <tr><th>اللون</th><td>${repair.color || "—"}</td></tr>
    <tr><th>العطل</th><td>${repair.issue || "—"}</td></tr>
    <tr><th>السعر النهائي</th><td>${priceDisplay(
      repair.finalPrice,
      repair.price
    )}</td></tr>
    <tr><th>الضمان</th><td>${warrantyTxt}</td></tr>
  </table>

  <div class="note">
    <strong>ملاحظات الضمان:</strong> ${SHOP.warrantyNote}
  </div>
  <div class="footer">${SHOP.footer}</div>

  <script>window.onload = () => window.print();</script>
</body>
</html>`;
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  function handleWhatsAppMessage() {
    if (!repair?.phone) {
      alert("لا يوجد رقم هاتف للعميل.");
      return;
    }
    const digits = String(repair.phone).replace(/\D+/g, "");
    const normalized = digits.replace(/^0+/, "");
    const phoneE164 = `20${normalized}`;

    const partsSummary = (repair.parts || [])
      .map((p) => {
        const c = Number(p.cost);
        const cTxt = Number.isFinite(c) ? ` (${Math.round(c)}ج)` : "";
        return `- ${p.name || "قطعة"}${cTxt}`;
      })
      .join("\n");

    const warrantyLine =
      repair?.hasWarranty && repair?.warrantyEnd
        ? `الضمان حتى ${formatDate(repair.warrantyEnd)}`
        : "بدون تاريخ ضمان محدد";

    const msg = [
      `أهلاً ${repair.customerName || "عميلنا الكريم"} 👋`,
      `يسعدنا إبلاغك أن جهازك (${repair.deviceType || "الجهاز"}) أصبح ${
        repair.status === "تم التسليم" ? "جاهزًا وتم تسليمه" : "جاهزًا"
      } ✅`,
      `العطل: ${repair.issue || "—"}`,
      `السعر النهائي: ${priceDisplay(repair.finalPrice, repair.price)} جنيه`,
      `القطع المستخدمة:\n${partsSummary || "- لا توجد قطع"}`,
      `الضمان: ${warrantyLine}`,
      trackingUrl ? `رابط تتبّع/تفاصيل الصيانة: ${trackingUrl}` : null,
      "",
      "نطمح لمعرفة مدى رضاك عن الخدمة. لو عندك أي ملاحظات أو احتجت مساعدة احنا موجودين دايمًا 🌟",
      SHOP.name,
    ]
      .filter(Boolean)
      .join("\n");

    const url = `https://wa.me/${phoneE164}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  }

  if (loading) return <div>جارِ التحميل...</div>;
  if (error)
    return <div className="p-3 rounded-xl bg-red-50 text-red-800">{error}</div>;
  if (!repair) return <div>الصيانة غير موجودة.</div>;

  const cur = info.flows?.length ? info.flows[info.flows.length - 1] : null;
  const isCurrentCompleted = cur && cur.status === "completed";
  // fallback لو PALETTE مش متعرّف
  const CARD =
    (typeof PALETTE !== "undefined" && PALETTE.card) ||
    "bg-white/90 dark:bg-zinc-900/90 border border-slate-200 dark:border-slate-800";
  const SUBTLE =
    (typeof PALETTE !== "undefined" && PALETTE.subtle) ||
    "bg-slate-50 dark:bg-slate-800/60";

  // ألوان الشارات حسب النوع
  const TYPE_STYLE = {
    create:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
    update: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200",
    status_change:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200",
    assign_technician:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
    flow_complete:
      "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200",
    move_next:
      "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-200",
    delete: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200",
  };

  const count = (info.logs || []).length;
  return (
    <div className="space-y-6">
      {/* ===== Gradient Header ===== */}
      <div className="rounded-3xl overflow-hidden">
        <div className="bg-gradient-to-l from-fuchsia-600 via-violet-600 to-indigo-700 text-white p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                صيانة #{repair.repairId ?? "—"}
              </h1>
              <p className="opacity-90 mt-1">
                تابع الحالة والخطوات وأرسل تحديثات للعميل بسهولة.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const token = repair?.publicTracking?.token;
                  const url = token
                    ? `${window.location.origin}/t/${token}`
                    : "";
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
                <Link
                  to={`/repairs/${id}/edit`}
                  className="px-3 py-2 rounded-xl bg-white/90 text-indigo-700 hover:opacity-90"
                >
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

      {/* ===== الحالة + معلومات مختصرة ===== */}
      <section className={`p-4 md:p-5 rounded-2xl ${PALETTE.card}`}>
        <div className="grid md:grid-cols-4 gap-3 items-end">
          <div>
            <div className="text-sm opacity-80 mb-1">الحالة</div>
            <select
              value={repair.status || ""}
              onChange={(e) => handleStatusPick(e.target.value)}
              disabled={!canEditAll && !isAssigned}
              className="px-3 py-2 rounded-xl border w-full"
            >
              <option value="">اختر حالة</option>
              {STATUS_SELECT.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {!canEditAll && isAssigned && (
              <div className="text-xs opacity-70 mt-1">
                عند اختيار “تم التسليم” سيُطلب كلمة السر.
              </div>
            )}
            {repair.status === "مرفوض" && (
              <div className="mt-2">
                <div className="text-sm opacity-80 mb-1">
                  مكان الجهاز عند الرفض
                </div>
                <select
                  value={repair.rejectedDeviceLocation || "بالمحل"}
                  onChange={(e) => changeRejectedLocation(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200"
                  disabled={!canEditAll && !isAssigned}
                >
                  <option value="بالمحل">بالمحل</option>
                  <option value="مع العميل">مع العميل</option>
                </select>
                <div className="text-xs opacity-70 mt-1">
                  اختيار "مع العميل" يسجّل وقت التسليم تلقائيًا.
                </div>
              </div>
            )}
          </div>

          <Info
            label="القسم الحالي"
            value={info.currentDepartment?.name || "—"}
          />
          <Info label="تاريخ الإنشاء" value={formatDate(repair.createdAt)} />
          <Info label="المستلم" value={repair?.createdBy?.name || "—"} />ff
        </div>
      </section>

      {/* ===== التايملاين ===== */}
      <section className={`p-4 md:p-5 rounded-2xl ${PALETTE.card}`}>
        <h3 className="text-lg font-semibold mb-3">الخطوات</h3>
        {(info.flows || []).length === 0 ? (
          <div className="opacity-70">لا توجد خطوات بعد. عيّن قسمًا للبدء.</div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {info.flows.map((f, i) => (
              <div
                key={f._id}
                className={`p-3 rounded-2xl ${PALETTE.subtle} border dark:border-slate-700`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold">
                    {i + 1}. {f.department?.name || "قسم"}
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full border dark:border-slate-600">
                    {STATUS_AR[f.status] || f.status}
                  </span>
                </div>
                <div className="text-sm mt-1">
                  فنّي:{" "}
                  <b>
                    {f.technician
                      ? f.technician.name ||
                        f.technician.username ||
                        f.technician.email
                      : "غير معيّن"}
                  </b>
                  {" · "}السعر: <b>{Number(f.price || 0).toFixed(2)}</b>
                </div>
                <div className="text-xs opacity-70 mt-1">
                  بدأ:{" "}
                  {f.startedAt ? new Date(f.startedAt).toLocaleString() : "-"} |
                  اكتمل:{" "}
                  {f.completedAt
                    ? new Date(f.completedAt).toLocaleString()
                    : "-"}
                </div>
                {f.notes && (
                  <div className="text-sm mt-1">ملاحظات: {f.notes}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* إجمالي تسعير الأقسام */}
        <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
          إجمالي تسعير الأقسام:{" "}
          <b>{Number(info.departmentPriceTotal || 0).toFixed(2)}</b>
        </div>
      </section>

      {/* ===== التحكم في الخطوة الحالية ===== */}
      <section className={`p-4 md:p-5 rounded-2xl ${PALETTE.card}`}>
        <h3 className="text-lg font-semibold mb-3">الخطوة الحالية</h3>
        <div className="text-sm mb-2">
          القسم الحالي: <b>{info.currentDepartment?.name || "-"}</b>
        </div>

        {/* تعيين فنّي */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="border rounded-lg px-3 py-2"
            value={assignTechId}
            onChange={(e) => setAssignTechId(e.target.value)}
            disabled={!info.acl?.canAssignTech || !info.currentDepartment}
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
                await RepairsAPI.assignTech(id, { technicianId: assignTechId });
                setAssignTechId("");
                await loadTimeline();
              } catch (e) {
                alert(e?.response?.data?.error || "غير مسموح بتعيين الفني");
              }
            }}
            disabled={!info.acl?.canAssignTech}
          >
            تعيين الفنّي (أو بدء العمل)
          </ActionButton>
        </div>

        {/* إكمال الخطوة الحالية + تسعيرها */}
        <div className="flex flex-wrap items-end gap-2 mt-4">
          <div>
            <label className="block text-sm mb-1">سعر القسم</label>
            <input
              type="number"
              step="0.01"
              className="border rounded-lg px-3 py-2 w-36"
              value={stepPrice}
              onChange={(e) => setStepPrice(e.target.value)}
            />
          </div>
          <div className="grow">
            <label className="block text-sm mb-1">ملاحظات (اختياري)</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={stepNotes}
              onChange={(e) => setStepNotes(e.target.value)}
            />
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
              !info.acl?.canCompleteCurrent ||
              !cur ||
              cur.status === "completed"
            }
          >
            تعليم كمكتمل + حفظ السعر
          </ActionButton>
        </div>

        {/* نقل للخطوة/القسم التالي */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <select
            className="border rounded-lg px-3 py-2"
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
                  e?.response?.data?.error || "غير مسموح بالنقل للخطوة التالية"
                );
              }
            }}
            disabled={
              !info.acl?.canMoveNext ||
              (!isCurrentCompleted && info.flows?.length > 0)
            }
          >
            نقل الصيانة للقسم التالي
          </ActionButton>
        </div>
      </section>

      {/* ===== بيانات أساسية ===== */}
      <section className={`p-4 md:p-5 rounded-2xl ${PALETTE.card}`}>
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

      {/* ===== إرسال تحديث للعميل ===== */}
      <section className={`p-4 md:p-5 rounded-2xl ${PALETTE.card}`}>
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

      {/* ===== السجل ===== */}
      <section dir="rtl" className={`p-4 md:p-5 rounded-2xl ${CARD} shadow-sm`}>
        {/* عنوان وعداد */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="font-semibold text-base md:text-lg flex items-center gap-2">
            <span
              className="inline-flex w-2 h-2 rounded-full bg-indigo-500"
              aria-hidden
            />
            سجل الحركات
          </h3>
          <span className="text-xs md:text-sm px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
            {count} حدث
          </span>
        </div>

        {/* Desktop table */}
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
              {count === 0 ? (
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
                        {/* نقطة ملونة صغيرة */}
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-current opacity-70"
                          aria-hidden
                        />
                        {TYPE_AR?.[lg.type] || lg.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {/* نعيد استخدام LogRow لو عندك تفاصيله—أو نعرض الوصف المختصر */}
                      <LogRow log={lg} deps={deps} flows={info.flows} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden grid gap-2">
          {count === 0 ? (
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

                  <h4 className="text-sm mt-2 font-semibold">{summary}</h4>

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

      {/* ===== Modals ===== */}
      <QrAfterCreateModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        trackingUrl={trackingUrl}
        repair={repair}
      />

      <DeliveryModal
        open={deliverOpen}
        onClose={() => setDeliverOpen(false)}
        onSubmit={submitDelivery}
        initialFinalPrice={repair.finalPrice ?? repair.price ?? 0}
        initialParts={repair.parts || []}
        requirePassword={requirePassword}
      />

      {/* مودال اختيار تاريخ الضمان بعد مكتمل/تسليم */}
      {showWarrantyModal && (
        <div className="fixed inset-0 grid place-items-center bg-black/40 z-50">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl w-[380px] space-y-3">
            <h3 className="text-lg font-semibold">حدد تاريخ انتهاء الضمان</h3>
            <input
              type="date"
              className="border p-2 w-full rounded-xl"
              value={warrantyEnd}
              onChange={(e) => setWarrantyEnd(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                className="px-2 py-1 rounded-xl border"
                onClick={() => setWarrantyEnd(addDays(7))}
              >
                أسبوع
              </button>
              <button
                className="px-2 py-1 rounded-xl border"
                onClick={() => setWarrantyEnd(addDays(30))}
              >
                شهر
              </button>
              <button
                className="px-2 py-1 rounded-xl border"
                onClick={() => setWarrantyEnd(addDays(90))}
              >
                3 شهور
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-2 rounded-xl border"
                onClick={() => setShowWarrantyModal(false)}
              >
                إلغاء
              </button>
              <button
                className={`px-3 py-2 rounded-xl ${PALETTE.primary}`}
                onClick={async () => {
                  if (!warrantyEnd) return;
                  await setWarranty(repair._id, {
                    hasWarranty: true,
                    warrantyEnd,
                  });
                  setShowWarrantyModal(false);
                  const r = await getRepair(id);
                  setRepair({
                    ...r,
                    price: toNum(r.price) ?? r.price,
                    finalPrice: toNum(r.finalPrice) ?? r.finalPrice,
                  });
                  if (["مكتمل", "تم التسليم"].includes(r?.status)) {
                    setAfterCompleteOpen(true);
                  }
                }}
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال ما بعد الإكمال/التسليم */}
      {afterCompleteOpen && (
        <AfterCompleteModal
          open={afterCompleteOpen}
          onClose={() => setAfterCompleteOpen(false)}
          onPrint={handlePrintReceipt}
          onWhatsApp={handleWhatsAppMessage}
          hasWarranty={!!(repair?.hasWarranty && repair?.warrantyEnd)}
        />
      )}

      {/* Inputs base style */}
      <style>{`.inp{padding:.6rem .8rem;border-radius:.9rem;background:var(--inp-bg,#f3f4f6)}`}</style>
    </div>
  );
}

/* ===== Small UI helpers ===== */
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

const STATUS_AR = {
  waiting: "في الانتظار",
  in_progress: "جاري العمل",
  completed: "مكتمل",
};

/* ==== سجلّ الحركات بصياغة ودّية ==== */
const TYPE_AR = {
  create: "إنشاء",
  update: "تعديل",
  status_change: "تغيير حالة",
  assign_technician: "تعيين فنّي",
  flow_complete: "اكتمال خطوة",
  move_next: "نقل إلى قسم",
  delete: "حذف",
};
const STATUS_AR_FULL = {
  waiting: "في الانتظار",
  in_progress: "جاري العمل",
  completed: "مكتمل",
  "في الانتظار": "في الانتظار",
  "جاري العمل": "جاري العمل",
  مكتمل: "مكتمل",
  "تم التسليم": "تم التسليم",
  مرفوض: "مرفوض",
  مرتجع: "مرتجع",
};

function friendlyField(key = "") {
  const map = {
    status: "الحالة",
    price: "السعر",
    finalPrice: "السعر النهائي",
    color: "اللون",
    deviceType: "نوع الجهاز",
    issue: "العطل",
    technician: "الفني",
    deliveryDate: "تاريخ التسليم",
    returnDate: "تاريخ المرتجع",
    rejectedDeviceLocation: "مكان الجهاز (مرفوض)",
    parts: "قطع الغيار",
    notes: "ملاحظات",
    phone: "الهاتف",
    customerName: "اسم العميل",
  };
  return map[key] || key;
}
function renderVal(v) {
  if (Array.isArray(v)) return `(${v.length} عنصر)`;
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "نعم" : "لا";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v.length > 50 ? v.slice(0, 50) + "…" : v;
  try {
    const s = JSON.stringify(v);
    return s.length > 60 ? s.slice(0, 60) + "…" : s;
  } catch {
    return "—";
  }
}
function describeLog(log, { deps = [], flows = [] } = {}) {
  const p = log?.payload || {};
  const depById = new Map(deps.map((d) => [String(d._id), d]));
  const flowById = new Map(flows.map((f) => [String(f._id), f]));
  const out = { summary: "", details: [], partsChange: null };

  switch (log?.type) {
    case "create":
      out.summary = "تم إنشاء الصيانة";
      break;

    case "status_change": {
      const st = STATUS_AR_FULL[p.status] || p.status || "—";
      out.summary = `تم تغيير الحالة إلى «${st}»`;
      break;
    }

    case "assign_technician": {
      const f = p.flowId ? flowById.get(String(p.flowId)) : null;
      const depName =
        f?.department?.name ||
        depById.get(String(f?.department))?.name ||
        "قسم";
      const techName =
        f?.technician?.name ||
        p.technicianName ||
        (p.technicianId
          ? `الفنّي (#${String(p.technicianId).slice(-4)})`
          : "—");
      out.summary = `تم تعيين «${techName}» على خطوة قسم «${depName}»`;
      break;
    }

    case "flow_complete": {
      const f = p.flowId ? flowById.get(String(p.flowId)) : null;
      const depName =
        f?.department?.name ||
        depById.get(String(f?.department))?.name ||
        "قسم";
      out.summary = `اكتملت خطوة قسم «${depName}»`;
      if (Number.isFinite(Number(p.price)))
        out.details.push(`سعر القسم: ${Number(p.price).toFixed(2)} جنيه`);
      if (p.notes) out.details.push(`ملاحظات: ${p.notes}`);
      break;
    }

    case "move_next": {
      const depName = depById.get(String(p.departmentId))?.name || "—";
      out.summary = `تم نقل الصيانة إلى قسم «${depName}»`;
      break;
    }

    case "update": {
      out.summary = "تم تعديل البيانات";
      const changes = Array.isArray(p.changes) ? p.changes : [];
      for (const c of changes) {
        if (c.field === "parts") {
          out.partsChange = { fromVal: c.from, toVal: c.to };
          continue;
        }
        const label = friendlyField(c.field);
        const fromTxt = renderVal(c.from);
        const toTxt = renderVal(c.to);
        out.details.push(`${label}: من «${fromTxt}» إلى «${toTxt}»`);
      }
      break;
    }

    case "delete":
      out.summary = "تم حذف الصيانة";
      break;

    default:
      out.summary = TYPE_AR[log?.type] || log?.type || "—";
      if (p && Object.keys(p).length) out.details.push(JSON.stringify(p));
  }

  return out;
}
function LogRow({ log, deps, flows }) {
  const { summary, details } = describeLog(log, { deps, flows });
  const timeTxt = new Date(
    log.at || log.createdAt || Date.now()
  ).toLocaleString("ar-EG");
  return (
    <tr className="align-top">
      <td className="py-2 px-2 whitespace-nowrap">{timeTxt}</td>
      <td className="py-2 px-2 whitespace-nowrap">
        {TYPE_AR[log.type] || log.type}
      </td>
      <td className="py-2 px-2">
        <div>{summary}</div>
        {Array.isArray(details) && details.length > 0 && (
          <ul className="list-disc pr-5 mt-1 space-y-1">
            {details.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        )}
      </td>
    </tr>
  );
}

// PartsChange اختياري: لو عندك نفس المكوّن في المشروع هيشتغل تلقائيًا.
// لو مش موجود، احذف جزء استدعاؤه داخل LogRow.

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

/* ===== مودال ما بعد الإكمال/التسليم ===== */
function AfterCompleteModal({
  open,
  onClose,
  onPrint,
  onWhatsApp,
  hasWarranty,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/40">
      <div className="bg-white dark:bg-gray-800 w-[420px] max-w-[92vw] rounded-2xl p-4 space-y-3 shadow-xl">
        <h3 className="text-lg font-semibold">تم إنهاء العملية</h3>
        <p className="text-sm opacity-80">
          {hasWarranty
            ? "هل تودّ طباعة إيصال الضمان أو مراسلة العميل على واتساب؟"
            : "هل تودّ مراسلة العميل على واتساب؟"}
        </p>
        <div
          className={`grid ${
            hasWarranty ? "sm:grid-cols-2" : "sm:grid-cols-1"
          } gap-2`}
        >
          {hasWarranty && (
            <button
              className={`px-3 py-2 rounded-xl ${PALETTE.ok}`}
              onClick={() => onPrint?.()}
            >
              طباعة إيصال الضمان
            </button>
          )}
          <button
            className={`px-3 py-2 rounded-xl bg-green-600 text-white`}
            onClick={() => onWhatsApp?.()}
          >
            إرسال رسالة واتساب
          </button>
        </div>
        <div className="flex justify-end">
          <button
            className={`px-3 py-2 rounded-xl ${PALETTE.outline}`}
            onClick={onClose}
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
