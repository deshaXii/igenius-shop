import React, { useMemo } from "react";

/**
 * props:
 * - shopName        : string (مثلاً "IGenius")
 * - ticketNo        : string|number (مثلاً repair.serial || repair.code || repair._id.slice(-6))
 * - customerName    : string
 * - customerPhone   : string
 * - deviceType      : string (نوع/ماركة الجهاز)
 * - repairSummary   : string (صيـانة الجهاز)
 * - handoverAt      : string|Date (وقت التسليم للعميل المتوقع)
 * - receivedAt      : string|Date (وقت الاستلام من العميل)
 * - price           : number
 * - paid            : number
 * - logoUrl         : string (اختياري: لوجو IGenius)
 * - qrDataUrl       : string (اختياري: QR كـ dataURL لو عايز تطبعه أعلى الإيصال)
 */
export default function RepairReceipt({
  shopName = "IGenius",
  ticketNo = "",
  customerName = "",
  customerPhone = "",
  deviceType = "",
  repairSummary = "",
  handoverAt = "",
  receivedAt = "",
  price = 0,
  paid = 0,
  logoUrl = "/icons/icon-192.png",
  qrDataUrl = null,
}) {
  const today = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }, []);
  const weekday = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("ar-EG", { weekday: "long" });
  }, []);

  const fmt = (v) => (v ? String(v) : "..................");
  const fmtDateTime = (v) => {
    if (!v) return "..................";
    const d = new Date(v);
    if (isNaN(d)) return fmt(v);
    return d.toLocaleString("ar-EG", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const rest = Math.max(0, Number(price || 0) - Number(paid || 0));

  return (
    <div className="receipt rtl" dir="rtl">
      <style>{`
        /* حجم طباعة حراري 80mm */
        @page { size: 80mm auto; margin: 5mm; }
        .receipt {
          width: 72mm; /* داخل هوامش الصفحة */
          font-family: "Cairo", system-ui, -apple-system, Segoe UI, Roboto, "Noto Kufi Arabic", Arial, sans-serif;
          color: #111827;
          line-height: 1.4;
        }
        .header {
          display:flex; align-items:center; gap:.6rem; margin-bottom:.3rem;
        }
        .logo { width: 26px; height: 26px; object-fit: contain; }
        .title {
          font-weight: 800; letter-spacing: .5px; font-size: 16px;
        }
        .badge {
          display:inline-block; border:1px solid #111; padding:2px 6px; border-radius:10px;
          font-size: 11px; margin-top:2px;
        }
        .ticket-no { color:#ef4444; font-weight:700; font-size:14px; }
        .row { display:flex; justify-content:space-between; gap:.75rem; margin: 4px 0; }
        .k { color:#4b5563; min-width: 88px; }
        .v { flex: 1; text-align: right; border-bottom: 1px dotted #9ca3af; }
        .section { margin-top:.35rem; }
        .sig { height:48px; border:1px dashed #d1d5db; border-radius:8px; display:flex; align-items:center; justify-content:center; margin-top:.4rem; }
        .footer { margin-top:.5rem; font-size:11px; color:#6b7280; text-align:center;}
        /* إخفاء أي أزرار في وضع الطباعة */
        @media print {
          .no-print { display:none !important; }
        }
      `}</style>

      <div className="header">
        {logoUrl ? <img className="logo" src={logoUrl} alt="logo" /> : null}
        <div>
          <div className="title">{shopName}</div>
          <div className="badge">إيصال استلام</div>
        </div>
        <div style={{ marginInlineStart: "auto" }} className="ticket-no">
          {fmt(ticketNo)}
        </div>
      </div>

      {qrDataUrl ? (
        <div
          style={{ display: "flex", justifyContent: "center", margin: "6px 0" }}
        >
          <img src={qrDataUrl} alt="QR" style={{ width: 72, height: 72 }} />
        </div>
      ) : null}

      <div className="section">
        <div className="row">
          <div className="k">اليوم</div>
          <div className="v">{weekday}</div>
        </div>
        <div className="row">
          <div className="k">التاريخ</div>
          <div className="v">{today}</div>
        </div>
        <div className="row">
          <div className="k">اسم العميل</div>
          <div className="v">{fmt(customerName)}</div>
        </div>
        <div className="row">
          <div className="k">رقم التليفون</div>
          <div className="v">{fmt(customerPhone)}</div>
        </div>
        <div className="row">
          <div className="k">نوع الجهاز</div>
          <div className="v">{fmt(deviceType)}</div>
        </div>
        <div className="row">
          <div className="k">نوع الصيانة</div>
          <div className="v">{fmt(repairSummary)}</div>
        </div>
        {/* <div className="row">
          <div className="k">وقت التسليم</div>
          <div className="v">{fmtDateTime(handoverAt)}</div>
        </div> */}
        <div className="row">
          <div className="k">وقت الاستلام</div>
          <div className="v">{fmtDateTime(receivedAt)}</div>
        </div>
        <div className="row">
          <div className="k">السعر</div>
          <div className="v">{Number(price || 0).toFixed(2)} ج.م</div>
        </div>
        <div className="row">
          <div className="k">دفع</div>
          <div className="v">{Number(paid || 0).toFixed(2)} ج.م</div>
        </div>
        <div className="row">
          <div className="k">باقي</div>
          <div className="v">{rest.toFixed(2)} ج.م</div>
        </div>
        <div className="row">
          <div className="k">توقيع المدير</div>
          <div className="v">&nbsp;</div>
        </div>
        <div className="sig">—</div>
      </div>

      <div className="footer">* يُرجى إحضار هذه الورقة عند الاستلام</div>
    </div>
  );
}
