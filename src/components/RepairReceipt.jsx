// src/components/RepairReceipt.jsx
import React from "react";

/**
 * Thermal-friendly receipt component.
 * يعتمد بالكامل على الـprops — بدون جلب بيانات من الخارج.
 *
 * Props الأساسية (كما تُمرَّر من QrAfterCreateModal):
 * - shopName
 * - ticketNo
 * - customerName
 * - customerPhone
 * - deviceType
 * - repairSummary
 * - handoverAt
 * - receivedAt
 * - price
 * - paid
 * - logoUrl
 * - qrDataUrl
 *
 * إعدادات الإيصال:
 * - receiptMessage (نص يظهر تحت "يرجى إحضار ...")
 * - receiptFontSizePt
 * - receiptPaperWidthMm
 * - receiptMarginMm
 *
 * الهوامش وأحجام الطباعة النهائية تُطبَّق من دالة الطباعة في QrAfterCreateModal،
 * هنا نحافظ فقط على بنية نظيفة.
 */

export default function RepairReceipt(props) {
  const {
    shopName = "",
    ticketNo = "",
    customerName = "",
    customerPhone = "",
    deviceType = "",
    repairSummary = "",
    handoverAt = "",
    receivedAt = "",
    price = 0,
    paid = 0,
    logoUrl = "",
    qrDataUrl = "",
    // إعدادات الإيصال
    receiptMessage = "",
  } = props;

  const fmt = (v) => {
    if (!v && v !== 0) return "—";
    if (typeof v === "number") return v.toFixed(0);
    try {
      const d = new Date(v);
      if (!isNaN(d)) return d.toLocaleString("ar-EG");
    } catch {}
    return String(v);
  };

  return (
    <div
      dir="rtl"
      style={{
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Naskh Arabic", "Noto Kufi Arabic", Tahoma, Arial',
        lineHeight: 1.35,
      }}
    >
      {/* رأس */}
      <div style={{ textAlign: "center" }}>
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="logo"
            style={{ width: 64, height: 64, margin: "0 auto 6px" }}
          />
        ) : null}
        <div style={{ fontWeight: 700 }}>{shopName || "المحل"}</div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>إيصال استلام</div>
      </div>

      <hr style={{ borderTop: "1px dashed #bbb", margin: "6px 0" }} />

      {/* بيانات أساسية */}
      <div style={{ fontSize: 12 }}>
        <div>
          رقم الإيصال: <b>{ticketNo || "—"}</b>
        </div>
        <div>
          العميل: <b>{customerName || "—"}</b>
        </div>
        <div>
          الهاتف: <b dir="ltr">{customerPhone || "—"}</b>
        </div>
        <div>
          الجهاز: <b>{deviceType || "—"}</b>
        </div>
        {repairSummary ? (
          <div>
            الملخص: <b>{repairSummary}</b>
          </div>
        ) : null}
      </div>

      <hr style={{ borderTop: "1px dashed #bbb", margin: "6px 0" }} />

      {/* أوقات/مبالغ */}
      <div style={{ fontSize: 12 }}>
        <div>
          تاريخ الاستلام: <b>{fmt(receivedAt)}</b>
        </div>
        {handoverAt ? (
          <div>
            تاريخ التسليم المتوقع: <b>{fmt(handoverAt)}</b>
          </div>
        ) : null}
        <div>
          التكلفة التقديرية: <b>{fmt(price)}</b>
        </div>
        <div>
          المدفوع: <b>{fmt(paid)}</b>
        </div>
      </div>

      {qrDataUrl ? (
        <>
          <hr style={{ borderTop: "1px dashed #bbb", margin: "6px 0" }} />
          <div style={{ textAlign: "center" }}>
            <img
              src={qrDataUrl}
              alt="QR"
              style={{
                width: 140,
                height: 140,
                display: "inline-block",
                background: "#fff",
              }}
            />
          </div>
        </>
      ) : null}

      <hr style={{ borderTop: "1px dashed #bbb", margin: "6px 0" }} />

      {/* النص الإجباري + الرسالة القابلة للتخصيص */}
      <div style={{ fontSize: 11 }}>
        يُرجى إحضار هذه الورقة عند الاستلام
      </div>
      {receiptMessage ? (
        <div style={{ fontSize: 11, marginTop: 4 }}>{receiptMessage}</div>
      ) : null}

      <div style={{ fontSize: 10, opacity: 0.7, marginTop: 6, textAlign: "center" }}>
        شكراً لثقتكم بنا
      </div>
    </div>
  );
}
