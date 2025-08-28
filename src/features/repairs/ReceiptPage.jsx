import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getRepair } from "./repairsApi";
import formatDate from "../../utils/formatDate";

function egp(n) {
  const num = Number(n ?? 0);
  if (!Number.isFinite(num)) return "—";
  return `ج.م ${num.toLocaleString("ar-EG", { maximumFractionDigits: 0 })}`;
}
function dayName(d) {
  try {
    return new Intl.DateTimeFormat("ar-EG", { weekday: "long" }).format(
      new Date(d)
    );
  } catch {
    return "—";
  }
}

export default function ReceiptPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [repair, setRepair] = useState(null);
  const [err, setErr] = useState("");

  const trackingUrl = useMemo(() => {
    const token = repair?.publicTracking?.token;
    return token ? `${window.location.origin}/t/${token}` : "";
  }, [repair]);

  useEffect(() => {
    (async () => {
      try {
        const r = await getRepair(id);
        setRepair(r);
      } catch (e) {
        setErr(e?.response?.data?.message || "تعذر تحميل بيانات الإيصال");
      } finally {
        setLoading(false);
        // اطبع تلقائيًا بعد التحميل (اختياري)
        setTimeout(() => window.print(), 250);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-sm opacity-70">جارٍ تجهيز الإيصال…</div>
      </div>
    );
  }
  if (err || !repair) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="p-3 rounded-xl bg-red-50 text-red-800">
          {err || "لا توجد بيانات"}
        </div>
      </div>
    );
  }

  const shopName =
    repair?.shopName || repair?.branch?.name || document.title || "المتجر";

  const code = repair?.repairId ?? repair?._id?.slice?.(-6) ?? "—";
  const customer = repair?.customerName || "—";
  const phone = repair?.phone || "—";
  const device = repair?.deviceType || "—";
  const issue = repair?.issue || "—";
  const created = repair?.createdAt;
  const receivedAt = repair?.deliveryDate || repair?.createdAt;

  const priceAgreed = Number.isFinite(+repair?.price) ? +repair.price : 0;
  const finalPrice = Number.isFinite(+repair?.finalPrice)
    ? +repair.finalPrice
    : priceAgreed;
  const paid = Number.isFinite(+repair?.paid) ? +repair.paid : 0;
  const remaining = Math.max(0, finalPrice - paid);

  return (
    <div dir="rtl" className="min-h-screen bg-gray-100 print:bg-white py-6">
      <div
        id="print-area"
        className="mx-auto bg-white print:bg-white shadow-sm print:shadow-none rounded-2xl print:rounded-none p-4"
        style={{ width: "min(100%, 80mm)" }} // 80mm لطابعات الإيصالات
      >
        {/* رأس الإيصال */}
        <header className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <img
              src="/icons/icon-512.png"
              alt="Logo"
              className="w-8 h-8 rounded"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
            <h1 className="font-extrabold tracking-wide">{shopName}</h1>
          </div>
          <div className="inline-flex items-center gap-2 text-[10px]">
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
              إيصال استلام
            </span>
            <span className="text-red-600 font-semibold">#{code}</span>
          </div>
        </header>

        {/* QR */}
        {trackingUrl ? (
          <div className="mt-3 grid place-items-center">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                trackingUrl
              )}`}
              alt="QR"
              className="w-[120px] h-[120px] border rounded-lg"
            />
            <div className="text-[10px] opacity-70 mt-1">
              تتبُّع حالة الصيانة
            </div>
          </div>
        ) : null}

        <Hr />

        {/* جدول المعلومات */}
        <table className="w-full text-[12px]">
          <tbody className="align-top">
            <Row label="اليوم" value={dayName(created)} />
            <Row label="التاريخ" value={formatDate(created)} />
            <Row label="اسم العميل" value={customer} />
            <Row label="رقم التليفون" value={phone} />
            <Row label="نوع الجهاز" value={device} />
            <Row label="نوع الصيانة" value={issue} />
            <Row label="وقت الاستلام" value={formatDate(receivedAt)} />
          </tbody>
        </table>

        <Hr />

        <table className="w-full text-[12px]">
          <tbody>
            <Row label="السعر" value={egp(finalPrice)} bold />
            <Row label="دفع" value={egp(paid)} />
            <Row label="باقي" value={egp(remaining)} />
          </tbody>
        </table>

        <Hr />

        <div className="text-[12px]">
          <div className="mb-1 opacity-80">توقيع المحرِّر</div>
          <div className="h-7 rounded-lg border border-dashed" />
        </div>

        <div className="mt-3 text-[10px] text-center opacity-70">
          * يُرجى إحضار هذا الإيصال عند الاستلام — شكراً لثقتكم بنا.
        </div>
      </div>

      {/* طباعة فقط منطقة الإيصال */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #print-area { width: 80mm !important; margin: 0 auto !important; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ---- UI bits ---- */
function Hr() {
  return (
    <div
      className="my-3 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"
      aria-hidden="true"
    />
  );
}
function Row({ label, value, bold }) {
  return (
    <tr className="border-b border-dashed last:border-b-0">
      <td className="py-1 pr-1 text-gray-600">{label}</td>
      <td className={`py-1 text-right ${bold ? "font-semibold" : ""}`}>
        {value || "—"}
      </td>
    </tr>
  );
}
