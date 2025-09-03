import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import useAuthStore from "../auth/authStore";
import { getRepair, updateRepair, updateRepairStatus, createCustomerUpdate, setWarranty } from "./repairsApi";
import formatDate from "../../utils/formatDate";
import DeliveryModal from "../../components/DeliveryModal";
import StatusSelect from "../../components/StatusSelect";
import QrAfterCreateModal from "../../components/QrAfterCreateModal";

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

const SHOP = {
  name: "IGenius",
  phone: "01000000000",
  address: "القاهرة — شارع المثال، عمارة 10",
  footer: "شكراً لاختياركم خدماتنا.",
  // ملاحظات الضمان الافتراضية (عدّلها براحتك)
  warrantyNote:
    "الضمان يشمل العطل المُصلّح فقط ولا يشمل سوء الاستخدام أو الكسر أو السوائل.",
};

export default function SingleRepairPage() {
  const { id } = useParams();
  const nav = useNavigate(); // قد تحتاجه لاحقًا
  const { user } = useAuthStore();

  const [qrOpen, setQrOpen] = useState(false);
  const [warrantyEnd, setWarrantyEnd] = useState("");
  const [showWarrantyModal, setShowWarrantyModal] = useState(false);

  const isAdmin = user?.role === "admin" || user?.permissions?.adminOverride;
  const canEditAll = isAdmin || user?.permissions?.editRepair;

  const [loading, setLoading] = useState(true);
  const [repair, setRepair] = useState(null);

  // مودال ما بعد الإكمال/التسليم (لطباعة إيصال الضمان/واتساب)
  const [afterCompleteOpen, setAfterCompleteOpen] = useState(false);

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

  // مودال التسليم
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [requirePassword, setRequirePassword] = useState(false);

  const isAssigned = useMemo(() => {
    if (!repair) return false;
    const techId = repair?.technician?._id || repair?.technician;
    const uid = user?.id || user?._id;
    return techId && uid && String(techId) === String(uid);
  }, [repair, user]);

  useEffect(() => {
    const h = () => load(); // إعادة التحميل عند حدث خارجي
    window.addEventListener("repairs:refresh", h);
    return () => window.removeEventListener("repairs:refresh", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const r = await getRepair(id);
      // توحيد أنواع الأرقام عند الاستلام
      const unified = {
        ...r,
        price: toNum(r.price) ?? r.price,
        finalPrice: toNum(r.finalPrice) ?? r.finalPrice,
      };
      setRepair(unified);
    } catch (e) {
      setError(e?.response?.data?.message || "حدث خطأ أثناء التحميل");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function onStatusChange(nextStatus) {
    if (!repair) return;

    if (nextStatus === "تم التسليم") {
      setRequirePassword(!canEditAll && isAssigned);
      setDeliverOpen(true);
      return;
    }

    if (nextStatus === "مرفوض") {
      const body = { status: "مرفوض" };
      if (!canEditAll && isAssigned) {
        const password = window.prompt("ادخل كلمة السر لتأكيد تغيير الحالة");
        if (!password) return;
        body.password = password;
      }
      changeStatus(body);
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
      const updated = await updateRepairStatus(id, body);
      setRepair({
        ...updated,
        price: toNum(updated.price) ?? updated.price,
        finalPrice: toNum(updated.finalPrice) ?? updated.finalPrice,
      });

      // ✅ منطق الضمان المطلوب:
      if (body?.status === "مكتمل" || body?.status === "تم التسليم") {
        if (updated?.hasWarranty === true && !updated?.warrantyEnd) {
          // لو عليه ضمان بدون تاريخ -> افتح اختيار التاريخ
          setShowWarrantyModal(true);
        } else if (updated?.hasWarranty === true && updated?.warrantyEnd) {
          // لو عليه ضمان ومعاه تاريخ -> افتح مودال الطباعة
          setAfterCompleteOpen(true);
        }
        // لو مفيش ضمان -> لا تُظهر أي شيء متعلق بالضمان
      }
    } catch (e) {
      alert(e?.response?.data?.message || "فشل تغيير الحالة");
    }
  }

  async function changeRejectedLocation(loc) {
    try {
      const body = { status: "مرفوض", rejectedDeviceLocation: loc };
      if (!canEditAll && isAssigned) {
        const password = window.prompt("ادخل كلمة السر لتأكيد تغيير مكان الجهاز");
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
        purchaseDate: p.purchaseDate ? new Date(p.purchaseDate).toISOString() : undefined,
      }));

      // السماح بتعديل السعرين من مودال التسليم لو موجودين
      const fp = payload.finalPrice;
      const p0 = payload.price; // يتطلب أن يكون لديك حقل السعر المبدئي في DeliveryModal (إن لم يوجد تجاهله)

      const body = {
        status: "تم التسليم",
        ...(fp !== "" && fp != null ? { finalPrice: Number(fp) } : {}),
        ...(p0 !== "" && p0 != null ? { price: Number(p0) } : {}),
        parts,
        ...(payload.password ? { password: payload.password } : {}),
      };

      // مهم: استخدم updateRepair (مش updateRepairStatus)
      const updated = await updateRepair(id, body);

      setRepair({
        ...updated,
        price: toNum(updated.price) ?? updated.price,
        finalPrice: toNum(updated.finalPrice) ?? updated.finalPrice,
      });
      setDeliverOpen(false);

      // ✅ منطق الضمان المطلوب بعد إتمام التسليم
      if (updated?.hasWarranty === true && !updated?.warrantyEnd) {
        setShowWarrantyModal(true);
      } else if (updated?.hasWarranty === true && updated?.warrantyEnd) {
        setAfterCompleteOpen(true);
      }
      // لو مفيش ضمان -> لا تُظهر أي شيء متعلق بالضمان
    } catch (e) {
      alert(e?.response?.data?.message || "خطأ أثناء إتمام التسليم");
    }
  }

  // طباعة إيصال الضمان
  function handlePrintReceipt() {
    if (!repair) return;
    const win = window.open("", "_blank", "width=800,height=900");
    const warrantyTxt = repair?.hasWarranty && repair?.warrantyEnd
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
    <tr><th>السعر النهائي</th><td>${priceDisplay(repair.finalPrice, repair.price)}</td></tr>
    <tr><th>الضمان</th><td>${warrantyTxt}</td></tr>
  </table>

  <div class="note">
    <strong>ملاحظات الضمان:</strong> ${SHOP.warrantyNote}
  </div>
  <div class="footer">${SHOP.footer}</div>

  <script>
    window.onload = () => window.print();
  </script>
</body>
</html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  // إنشاء رسالة واتساب وإرسالها
  function handleWhatsAppMessage() {
    if (!repair?.phone) {
      alert("لا يوجد رقم هاتف للعميل.");
      return;
    }
    // تهيئة رقم مصر: إزالة أي رموز و أصفار بادئة
    const digits = String(repair.phone).replace(/\D+/g, "");
    const normalized = digits.replace(/^0+/, ""); // شيل الأصفار في البداية
    const phoneE164 = `20${normalized}`; // بدون + حسب wa.me

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
      `يسعدنا إبلاغك أن جهازك (${repair.deviceType || "الجهاز"}) أصبح ${repair.status === "تم التسليم" ? "جاهزًا وتم تسليمه" : "جاهزًا"} ✅`,
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
  if (error) return <div className="p-3 rounded-xl bg-red-50 text-red-800">{error}</div>;
  if (!repair) return <div>الصيانة غير موجودة.</div>;

  return (
    <div className={`space-y-6 ${repair?.hasWarranty || null ? "goldOne" : ""}`}>
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">
          صيانة #{repair.repairId ?? "—"}
          {repair.hasWarranty && repair.warrantyEnd ? ` مع ضمان حتى ${formatDate(repair.warrantyEnd)}` : ""}
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (!trackingUrl) {
                alert("لم يتم تفعيل التتبّع بعد.");
                return;
              }
              setQrOpen(true);
            }}
            className="px-3 py-2 rounded-xl bg-emerald-600 text-white"
          >
            تتبُّع/QR
          </button>

          {canEditAll && (
            <Link
              to={`/repairs/${id}/edit`}
              className="px-3 py-2 rounded-xl bg-blue-600 text-white"
            >
              تعديل
            </Link>
          )}
          <Link
            to="/repairs"
            className="px-3 py-2 rounded-xl bg-gray-200 dark:bg-gray-700"
          >
            رجوع
          </Link>
        </div>
      </header>

      <section className="p-3 rounded-xl bg-white dark:bg-gray-800">
        <h2 className="font-semibold mb-2">التتبّع (QR)</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 items-end">
          <Info label="مرّات فتح رابط التتبّع" value={repair?.publicTracking?.views ?? 0} />
          <Info
            label="آخر فتح"
            value={
              repair?.publicTracking?.lastViewedAt
                ? formatDate(repair.publicTracking.lastViewedAt)
                : "—"
            }
          />
          <div className="contents sm:flex items-center gap-2">
            <button
              onClick={() => {
                const token = repair?.publicTracking?.token;
                const url = token ? `${window.location.origin}/t/${token}` : "";
                if (!url) return;
                navigator.clipboard.writeText(url);
              }}
              className="px-3 py-2 rounded-xl bg-gray-200 dark:bg-gray-700"
            >
              نسخ رابط التتبّع
            </button>
            <a
              className="px-3 py-2 rounded-xl bg-blue-600 text-white"
              href={
                repair?.publicTracking?.token
                  ? `${window.location.origin}/t/${repair.publicTracking.token}`
                  : "#"
              }
              target="_blank"
              rel="noreferrer"
            >
              فتح صفحة التتبّع
            </a>
          </div>
        </div>
      </section>

      {/* الحالة + التواريخ */}
      <section className="p-3 rounded-xl bg-white dark:bg-gray-800">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <label className="space-y-1">
            <div className="text-sm opacity-80">الحالة</div>
            <StatusSelect
              value={repair.status || ""}
              onChange={(v) => onStatusChange(v)}
              disabled={!canEditAll && !isAssigned}
            />
            {!canEditAll && isAssigned && (
              <div className="text-xs opacity-70 mt-1">
                عند اختيار “تم التسليم” سيُطلب كلمة السر.
              </div>
            )}

            {/* خانة مكان الجهاز تظهر فقط عند الرفض */}
            {repair.status === "مرفوض" && (
              <div className="mt-2">
                <div className="text-sm opacity-80 mb-1">مكان الجهاز عند الرفض</div>
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
          </label>

          <Info label="تاريخ الإنشاء" value={formatDate(repair.createdAt)} />
          <Info label="تاريخ الإستلام" value={formatDate(repair.deliveryDate)} />
          <Info label="الفني" value={repair?.technician?.name || "—"} />
        </div>
      </section>

      {/* بيانات العميل والجهاز */}
      <section className="p-3 rounded-xl bg-white dark:bg-gray-800 grid grid-cols-2 gap-3">
        <Info label="العميل" value={repair.customerName || "—"} />
        <Info label="الهاتف" value={repair.phone || "—"} />
        <Info label="الجهاز" value={repair.deviceType || "—"} />
        <Info label="اللون" value={repair.color || "—"} />
        <Info label="العطل" value={repair.issue || "—"} />
        <Info label="السعر المتفق عليه" value={numOrDash(repair.price)} />
        <Info label="السعر النهائي" value={numOrDash(repair.finalPrice)} />
        <Info label="ملاحظات" value={repair.notes || "—"} />
      </section>

      {/* إرسال تحديث للعميل */}
      <section className="mt-4 p-3 rounded-2xl border">
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
              className="px-4 py-2 rounded-xl bg-blue-600 text-white"
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

      {/* مودال الضمان: تحديد تاريخ الانتهاء */}
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
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 7);
                  setWarrantyEnd(d.toISOString().slice(0, 10));
                }}
              >
                أسبوع
              </button>
              <button
                className="px-2 py-1 rounded-xl border"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 30);
                  setWarrantyEnd(d.toISOString().slice(0, 10));
                }}
              >
                شهر
              </button>
              <button
                className="px-2 py-1 rounded-xl border"
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
                className="px-3 py-2 rounded-xl border"
                onClick={() => setShowWarrantyModal(false)}
              >
                إلغاء
              </button>
              <button
                className="px-3 py-2 rounded-xl bg-blue-600 text-white"
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
                  // لو الحالة بالفعل مكتمل/تم التسليم بعد تحديد الضمان، افتح مودال الطباعة
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

      {/* قطع الغيار */}
      <section className="p-3 rounded-xl bg-white dark:bg-gray-800">
        <h2 className="font-semibold mb-2">قطع الغيار</h2>
        {(repair.parts || []).length === 0 ? (
          <div className="opacity-70">لا توجد قطع</div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-right">
                    <th className="p-2">الاسم</th>
                    <th className="p-2">بواسطة</th>
                    <th className="p-2">المورد</th>
                    <th className="p-2">تاريخ الشراء</th>
                    <th className="p-2">التكلفة</th>
                  </tr>
                </thead>
                <tbody>
                  {repair.parts.map((p, i) => (
                    <tr key={i} className="odd:bg-gray-50 dark:odd:bg-gray-700/40">
                      <td className="p-2">{p.name || "—"}</td>
                      <td className="p-2">{p.source || "—"}</td>
                      <td className="p-2">{p.supplier || "—"}</td>
                      <td className="p-2">{p.purchaseDate ? formatDate(p.purchaseDate) : "—"}</td>
                      <td className="p-2">{numOrDash(p.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile */}
            <div className="space-y-2 sm:hidden">
              {repair.parts.map((p, i) => (
                <div key={i} className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700">
                  <div className="font-semibold mb-1">{p.name || "—"}</div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="opacity-70">بواسطة: </span>
                      <span>{p.source || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-70">المورد: </span>
                      <span>{p.supplier || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-70">تاريخ الشراء: </span>
                      <span>{p.purchaseDate ? formatDate(p.purchaseDate) : "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-70">التكلفة: </span>
                      <span>{numOrDash(p.cost)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <QrAfterCreateModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        trackingUrl={trackingUrl}
        repair={repair}
      />

      {/* مودال التسليم */}
      <DeliveryModal
        open={deliverOpen}
        onClose={() => setDeliverOpen(false)}
        onSubmit={submitDelivery}
        initialFinalPrice={repair.finalPrice ?? repair.price ?? 0}
        initialParts={repair.parts || []}
        requirePassword={requirePassword}
      />

      {/* نفتح مودال ما بعد الإكمال فقط إن كان هناك ضمان بتاريخ */}
      {afterCompleteOpen && (
        <AfterCompleteModal
          open={afterCompleteOpen}
          onClose={() => setAfterCompleteOpen(false)}
          onPrint={handlePrintReceipt}
          onWhatsApp={handleWhatsAppMessage}
          hasWarranty={!!(repair?.hasWarranty && repair?.warrantyEnd)}
        />
      )}
    </div>
  );
}

function Info({ label, value, children }) {
  const v = value ?? children ?? "—";
  return (
    <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700">
      <div className="text-xs opacity-70">{label}</div>
      <div className="font-semibold break-words">{v}</div>
    </div>
  );
}

/* ======================= Activity Log (Responsive) ======================= */
function ActivityLog({ logs = [] }) {
  const ordered = [...logs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <section className="mt-4 p-3 rounded-2xl bg-white dark:bg-gray-800 shadow-sm">
      <h2 className="font-semibold mb-3">سجلّ العمليات</h2>

      {/* بطاقات للموبايل */}
      <div className="md:hidden space-y-2">
        {ordered.map((l) => (
          <LogCard key={l._id} log={l} />
        ))}
      </div>

      {/* جدول للديسكتوب/التابلت */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-right">
              <Th>الوقت</Th>
              <Th>المستخدم</Th>
              <Th>الإجراء</Th>
              <Th>التفاصيل</Th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((l) => (
              <tr key={l._id} className="odd:bg-gray-50 dark:odd:bg-gray-700/40 align-top">
                <Td>{formatDate(l.createdAt)}</Td>
                <Td>{l?.changedBy?.name || "—"}</Td>
                <Td>
                  <ActionPill action={l.action} />
                </Td>
                <Td>
                  {l.details && <div className="mb-2">{l.details}</div>}

                  {Array.isArray(l.changes) && l.changes.length > 0 && (
                    <ul className="pr-4 space-y-2">
                      {l.changes.map((c, i) => {
                        if (c.field === "parts") {
                          return <PartsChange key={i} fromVal={c.from} toVal={c.to} />;
                        }
                        if (c.field === "partPaid") {
                          return (
                            <li key={i} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700/40">
                              <span className="opacity-70">دفع قطعة غيار: </span>
                              <span className="font-medium">{c?.to === true ? "تم الدفع" : "أُلغي الدفع"}</span>
                            </li>
                          );
                        }
                        return (
                          <li key={i} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700/40">
                            <span className="opacity-70">الحقل:</span>{" "}
                            <span className="font-medium">{friendlyField(c.field)}</span>{" "}
                            <span className="opacity-70">من</span>{" "}
                            <code className="px-1 rounded bg-gray-100 dark:bg-gray-700">{renderVal(c.from)}</code>{" "}
                            <span className="opacity-70">إلى</span>{" "}
                            <code className="px-1 rounded bg-gray-100 dark:bg-gray-700">{renderVal(c.to)}</code>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------- مكونات مساعدة لسجلّ الموبايل ---------- */
function ActionPill({ action }) {
  const map = {
    create: {
      text: "إنشاء",
      cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
          <path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z" />
        </svg>
      ),
    },
    update: {
      text: "تعديل",
      cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0L14.13 4.1l3.75 3.75 2.83-2.81z" />
        </svg>
      ),
    },
    delete: {
      text: "حذف",
      cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
          <path d="M6 7h12v2H6V7zm2 3h8l-1 9H9l-1-9zm3-6h2v2h-2V4z" />
        </svg>
      ),
    },
  };
  const cfg = map[action] || {
    text: action || "—",
    cls: "bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-200",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.icon} {cfg.text}
    </span>
  );
}

function timeAgo(date) {
  try {
    const d = new Date(date).getTime();
    const diff = Math.max(0, Date.now() - d);
    const s = Math.floor(diff / 1000);
    if (s < 60) return "منذ ثوانٍ";
    const m = Math.floor(s / 60);
    if (m < 60) return `منذ ${m} دقيقة`;
    const h = Math.floor(m / 60);
    if (h < 24) return `منذ ${h} ساعة`;
    const dys = Math.floor(h / 24);
    if (dys < 30) return `منذ ${dys} يوم`;
    const mo = Math.floor(dys / 30);
    if (mo < 12) return `منذ ${mo} شهر`;
    const y = Math.floor(mo / 12);
    return `منذ ${y} سنة`;
  } catch {
    return "";
  }
}

function LogCard({ log }) {
  const hasChanges = Array.isArray(log.changes) && log.changes.length > 0;

  return (
    <article className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 shadow-sm">
      {/* رأس البطاقة */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <ActionPill action={log.action} />
          <div className="text-sm">
            <span className="opacity-70">المستخدم: </span>
            <span className="font-medium">{log?.changedBy?.name || "—"}</span>
          </div>
        </div>
        <div className="text-xs text-right leading-5">
          <div className="opacity-70">{timeAgo(log.createdAt)}</div>
          <div className="opacity-60">{formatDate(log.createdAt)}</div>
        </div>
      </div>

      {/* التفاصيل العامة */}
      {log.details && <div className="mt-2 text-sm">{log.details}</div>}

      {/* تغييرات مفصّلة (قابلة للطيّ) */}
      {hasChanges && (
        <details className="mt-2 group">
          <summary className="cursor-pointer select-none text-sm font-semibold flex items-center gap-1">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <path d="M12 15.5 6 9.5h12z" />
            </svg>
            تفاصيل التغييرات
            <span className="opacity-60 font-normal">({log.changes.length})</span>
          </summary>
          <ul className="mt-2 space-y-2 pr-2">
            {log.changes.map((c, i) => {
              if (c.field === "parts") {
                return <PartsChange key={i} fromVal={c.from} toVal={c.to} />;
              }
              if (c.field === "partPaid") {
                return (
                  <li key={i} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700/40 text-sm">
                    <span className="opacity-70">دفع قطعة غيار: </span>
                    <span className="font-medium">{c?.to === true ? "تم الدفع" : "أُلغي الدفع"}</span>
                  </li>
                );
              }
              return (
                <li key={i} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700/40 text-sm">
                  <div className="opacity-70">
                    الحقل:{" "}
                    <span className="font-medium opacity-100">{friendlyField(c.field)}</span>
                  </div>
                  <div className="mt-1">
                    <span className="opacity-70">من</span>{" "}
                    <code className="px-1 rounded bg-gray-100 dark:bg-gray-700">{renderVal(c.from)}</code>{" "}
                    <span className="opacity-70">إلى</span>{" "}
                    <code className="px-1 rounded bg-gray-100 dark:bg-gray-700">{renderVal(c.to)}</code>
                  </div>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </article>
  );
}

function AfterCompleteModal({ open, onClose, onPrint, onWhatsApp, hasWarranty }) {
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
        <div className={`grid ${hasWarranty ? "sm:grid-cols-2" : "sm:grid-cols-1"} gap-2`}>
          {hasWarranty && (
            <button
              className="px-3 py-2 rounded-xl bg-emerald-600 text-white"
              onClick={() => onPrint?.()}
            >
              طباعة إيصال الضمان
            </button>
          )}
          <button
            className="px-3 py-2 rounded-xl bg-green-600 text-white"
            onClick={() => onWhatsApp?.()}
          >
            إرسال رسالة واتساب
          </button>
        </div>
        <div className="flex justify-end">
          <button className="px-3 py-2 rounded-xl border" onClick={onClose}>
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

/* ====== عرض وديف لقطع الغيار بشكل مفهوم ====== */
function PartsChange({ fromVal, toVal }) {
  const oldParts = toArray(fromVal);
  const newParts = toArray(toVal);

  const diff = diffParts(oldParts, newParts);

  if (diff.added.length === 0 && diff.removed.length === 0 && diff.updated.length === 0) {
    return (
      <li className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700/40">
        لا تغييرات جوهرية على قطع الغيار
      </li>
    );
  }

  const F = FIELD_LABELS;

  return (
    <li className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700/40 space-y-2">
      <div className="font-semibold">تعديلات قطع الغيار:</div>

      {diff.added.length > 0 && (
        <div>
          <div className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            + تمت إضافة {diff.added.length} قطعة:
          </div>
          <ul className="list-disc pr-5 mt-1 space-y-1">
            {diff.added.map((p, i) => (
              <li key={`a-${i}`}>{prettyPart(p)}</li>
            ))}
          </ul>
        </div>
      )}

      {diff.removed.length > 0 && (
        <div>
          <div className="text-sm font-medium text-red-700 dark:text-red-300">
            − تم حذف {diff.removed.length} قطعة:
          </div>
          <ul className="list-disc pr-5 mt-1 space-y-1">
            {diff.removed.map((p, i) => (
              <li key={`r-${i}`}>{prettyPart(p)}</li>
            ))}
          </ul>
        </div>
      )}

      {diff.updated.length > 0 && (
        <div>
          <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
            ✎ تم تعديل {diff.updated.length} قطعة:
          </div>
          <ul className="list-disc pr-5 mt-1 space-y-2">
            {diff.updated.map((u, i) => (
              <li key={`u-${i}`}>
                <div className="font-medium">{u.newer.name || u.older.name || "قطعة بدون اسم"}</div>
                <div className="mt-1 grid sm:grid-cols-2 gap-2">
                  {u.changes.map((chg, j) => (
                    <div
                      key={`c-${j}`}
                      className="rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-2"
                    >
                      <div className="text-xs opacity-70">{F[chg.field] || chg.field}</div>
                      <div className="text-sm">
                        <del className="opacity-70 mr-2">{simpleVal(chg.from, chg.field)}</del>
                        <span className="mx-1">→</span>
                        <strong>{simpleVal(chg.to, chg.field)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

/* ====== Helpers لقطع الغيار ====== */
const FIELD_LABELS = {
  name: "الاسم",
  source: "بواسطة",
  supplier: "المورد",
  cost: "التكلفة",
  purchaseDate: "تاريخ الشراء",
  qty: "الكمية",
  paid: "مدفوع؟",
};

function toArray(v) {
  try {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    if (typeof v === "string") return JSON.parse(v);
    return [];
  } catch {
    return [];
  }
}

function keyOf(p) {
  if (p && p._id) return String(p._id);
  const name = (p?.name || "").trim();
  const date = p?.purchaseDate ? new Date(p.purchaseDate).toISOString().slice(0, 10) : "";
  const cost = Number(p?.cost || 0);
  const sup = (p?.supplier || "").trim();
  const src = (p?.source || "").trim();
  return `${name}|${date}|${cost}|${sup}|${src}`;
}

function normalizePart(p) {
  return {
    _id: p?._id,
    name: p?.name || "",
    source: p?.source || "",
    supplier: p?.supplier || "",
    cost: Number(p?.cost ?? 0),
    purchaseDate: p?.purchaseDate || null,
    qty: Number(p?.qty ?? 1),
    paid: !!p?.paid,
  };
}

function diffParts(oldArr, newArr) {
  const oldMap = new Map(oldArr.map((x) => [keyOf(x), normalizePart(x)]));
  const newMap = new Map(newArr.map((x) => [keyOf(x), normalizePart(x)]));

  const added = [];
  const removed = [];
  const updated = [];

  for (const [k, v] of newMap) {
    if (!oldMap.has(k)) added.push(v);
  }
  for (const [k, v] of oldMap) {
    if (!newMap.has(k)) removed.push(v);
  }
  for (const [k, newP] of newMap) {
    if (!oldMap.has(k)) continue;
    const oldP = oldMap.get(k);
    const fields = ["name", "source", "supplier", "cost", "purchaseDate", "qty", "paid"];
    const changes = [];
    fields.forEach((f) => {
      const a = oldP[f];
      const b = newP[f];
      const aStr = f === "purchaseDate" ? (a ? new Date(a).toISOString() : null) : a;
      const bStr = f === "purchaseDate" ? (b ? new Date(b).toISOString() : null) : b;
      if (JSON.stringify(aStr) !== JSON.stringify(bStr)) {
        changes.push({ field: f, from: oldP[f], to: newP[f] });
      }
    });
    if (changes.length) updated.push({ older: oldP, newer: newP, changes });
  }

  return { added, removed, updated };
}

function simpleVal(v, field) {
  if (field === "purchaseDate") {
    return v ? formatDate(v) : "—";
  }
  if (field === "cost") {
    return Number.isFinite(Number(v)) ? Math.round(Number(v)) : v ?? "—";
  }
  if (field === "paid") {
    return v ? "مدفوع" : "غير مدفوع";
  }
  if (field === "qty") {
    return Number.isFinite(Number(v)) ? Number(v) : "—";
  }
  return v ?? "—";
}

function prettyPart(p) {
  const bits = [];
  if (p.name) bits.push(p.name);
  if (p.supplier) bits.push(`المورد: ${p.supplier}`);
  if (p.source) bits.push(`بواسطة: ${p.source}`);
  if (Number.isFinite(Number(p.cost))) bits.push(`التكلفة: ${Math.round(Number(p.cost))}`);
  if (p.purchaseDate) bits.push(`التاريخ: ${formatDate(p.purchaseDate)}`);
  if (Number.isFinite(Number(p.qty))) bits.push(`الكمية: ${Number(p.qty)}`);
  if (typeof p.paid === "boolean") bits.push(`الحالة: ${p.paid ? "مدفوع" : "غير مدفوع"}`);
  return bits.join(" • ");
}

/* ====== دوال عامة ====== */
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
    partPaid: "دفع قطعة غيار",
    notes: "ملاحظات",
    phone: "الهاتف",
    customerName: "اسم العميل",
  };
  return map[key] || key;
}

function renderVal(v) {
  if (Array.isArray(v)) {
    return `(${v.length} عنصر)`;
  }
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

function Th({ children }) {
  return (
    <th className="p-2 text-xs font-semibold text-gray-600 dark:text-gray-300 border-b">{children}</th>
  );
}

function Td({ children, className = "" }) {
  return <td className={`p-2 align-top ${className}`}>{children}</td>;
}
