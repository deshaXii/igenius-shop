// src/components/QrAfterCreateModal.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import RepairReceipt from "./RepairReceipt";

export default function QrAfterCreateModal({
  open,
  onClose,
  trackingUrl,
  repair,
  qrDataUrl, // اختياري: لو موصول جاهز من الخارج
}) {
  const [qrData, setQrData] = useState("");
  const receiptRef = useRef(null); // للإيصال فقط (مهم: ref واحد للإيصال)
  const labelRef = useRef(null); // للملصق (اختياري معاينة داخل iFrame)
  const [isCopying, setIsCopying] = useState(false);

  // توليد QR (لو ما جاش من props)
  useEffect(() => {
    let mounted = true;
    if (open && trackingUrl && !qrDataUrl) {
      QRCode.toDataURL(trackingUrl, { margin: 1, width: 256 })
        .then((url) => mounted && setQrData(url))
        .catch(() => mounted && setQrData(""));
    }
    return () => {
      mounted = false;
    };
  }, [open, trackingUrl, qrDataUrl]);

  // استخدم الجاهز إن وُجد وإلا المتولد في الستيت
  const qrSrc = useMemo(() => qrDataUrl || qrData, [qrDataUrl, qrData]);

  if (!open) return null;

  const ticketNo =
    repair?.serial ||
    repair?.code ||
    (repair?._id ? String(repair._id).slice(-6) : "");

  /* ---------- أدوات مساعدة ---------- */
  const printViaIframe = (htmlBody, title = "Print") => {
    // طباعة آمنة داخل iFrame (تشتغل في PWA)
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!doctype html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>${title}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            @page { size: auto; margin: 5mm; }
            html, body { margin:0; padding:0; }
          </style>
        </head>
        <body>${htmlBody}</body>
      </html>
    `);
    doc.close();

    let printed = false;
    let cleaned = false;
    const cleanUp = () => {
      if (cleaned) return;
      cleaned = true;
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    };
    const tryPrint = () => {
      if (printed) return;
      printed = true;
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        console.error("print error:", e);
      } finally {
        setTimeout(cleanUp, 1000);
      }
    };
    iframe.onload = () => setTimeout(tryPrint, 50);
    setTimeout(tryPrint, 300); // فallback
  };

  const copyUrl = async () => {
    try {
      setIsCopying(true);
      await navigator.clipboard?.writeText(trackingUrl);
      alert("تم نسخ رابط التتبّع");
    } catch {
      alert("تعذر نسخ الرابط، انسخه يدويًا.");
    } finally {
      setIsCopying(false);
    }
  };

  /* ---------- طباعة الإيصال ---------- */
  const handlePrintReceipt = () => {
    const src = receiptRef.current;
    if (!src) return console.warn("receiptRef is empty");
    // خُد نسخة ثابتة من الإيصال (لا تعتمد على نفس عقدة DOM الأصلية)
    const clone = src.cloneNode(true);
    printViaIframe(clone.outerHTML, "إيصال الاستلام");
  };

  /* ---------- طباعة ملصق الـ QR ---------- */
  const handlePrintLabel = () => {
    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto; padding:8mm;">
        <div style="border:1px solid #ddd;border-radius:8px;padding:8px;text-align:center">
          <div style="font-weight:700;margin-bottom:6px;font-size:14px">
            تتبّع صيانة #${ticketNo || "—"}
          </div>
          <div style="font-size:12px;opacity:.8;margin-bottom:6px">
            ${repair?.device?.type || repair?.deviceType || ""}
          </div>
          ${
            qrSrc
              ? `<img src="${qrSrc}" style="width:180px;height:180px" />`
              : ""
          }
          <div style="font-size:11px;margin-top:6px;word-break:break-all">${trackingUrl}</div>
        </div>
      </div>
    `;
    printViaIframe(html, "ملصق التتبّع");
  };

  console.log(repair);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-800 p-5 space-y-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="text-lg font-extrabold">تتبُّع الصيانة</div>
          <div className="ms-auto text-sm text-gray-500">
            رقم الإيصال:{" "}
            <span className="font-semibold">{ticketNo || "—"}</span>
          </div>
        </div>

        {/* QR Preview */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          {qrSrc ? (
            <img alt="qr" src={qrSrc} className="mx-auto w-48 h-48" />
          ) : (
            <div className="text-center text-sm text-gray-500">
              جارٍ توليد الكود…
            </div>
          )}
          <div className="mt-3 text-xs break-all p-2 rounded bg-gray-50 dark:bg-gray-700/40">
            {trackingUrl}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <button
            className="px-3 py-2 rounded-xl bg-gray-200 dark:bg-gray-700"
            onClick={copyUrl}
            disabled={isCopying}
            title="نسخ رابط التتبّع"
          >
            {isCopying ? "جارٍ النسخ…" : "نسخ الرابط"}
          </button>

          <a
            className="px-3 py-2 rounded-xl bg-gray-200 dark:bg-gray-700"
            href={trackingUrl}
            target="_blank"
            rel="noreferrer"
            title="فتح صفحة التتبّع"
          >
            فتح الرابط
          </a>

          <button
            className="px-3 py-2 rounded-xl bg-emerald-600 text-white"
            onClick={handlePrintLabel}
            disabled={!qrSrc}
            title="طباعة ملصق الـ QR"
          >
            طباعة ملصق
          </button>

          <button
            className="px-3 py-2 rounded-xl bg-blue-600 text-white"
            onClick={handlePrintReceipt}
            title="طباعة إيصال الاستلام"
          >
            طباعة إيصال الاستلام
          </button>

          <button
            className="px-3 py-2 rounded-xl bg-gray-300 dark:bg-gray-600"
            onClick={onClose}
            title="إغلاق"
          >
            تم
          </button>
        </div>

        {/* نسخة مخفية للإيصال — تُستخدم للطباعة عبر iFrame */}
        <div style={{ position: "fixed", left: -9999, top: -9999 }}>
          {/* نسخة مخفية للإيصال — تُستخدم للطباعة عبر iFrame */}
          <div style={{ position: "fixed", left: -9999, top: -9999 }}>
            <div ref={receiptRef}>
              <RepairReceipt
                shopName="الأقصى ستور"
                ticketNo={
                  repair?.serial ||
                  repair?.code ||
                  (repair?._id ? String(repair._id).slice(-6) : "")
                }
                /* === Fallbacks موسعة للأسماء === */
                customerName={
                  repair?.customerName ??
                  repair?.customer?.name ??
                  repair?.customer_name ??
                  repair?.client?.name ??
                  repair?.clientName ??
                  repair?.name ??
                  repair?.user?.name ??
                  ""
                }
                customerPhone={
                  repair?.customer?.phone ??
                  repair?.customer_phone ??
                  repair?.phone ??
                  repair?.client?.phone ??
                  repair?.mobile ??
                  repair?.user?.phone ??
                  ""
                }
                deviceType={
                  repair?.device?.type ??
                  repair?.deviceType ??
                  repair?.device_name ??
                  repair?.device ??
                  ""
                }
                repairSummary={
                  repair?.summary ??
                  repair?.problem ??
                  repair?.repairType ??
                  repair?.issue ??
                  repair?.description ??
                  repair?.notes ??
                  ""
                }
                handoverAt={
                  repair?.handoverAt ??
                  repair?.delivery_at ??
                  repair?.deliveryDate ??
                  repair?.expectedDeliveryAt ??
                  ""
                }
                receivedAt={
                  repair?.receivedAt ??
                  repair?.createdAt ??
                  repair?.created_at ??
                  ""
                }
                price={Number(
                  repair?.price ??
                    repair?.total ??
                    repair?.amount ??
                    repair?.cost ??
                    0
                )}
                paid={Number(
                  repair?.paid ?? repair?.deposit ?? repair?.advance ?? 0
                )}
                logoUrl="/icons/icon-192.png"
                qrDataUrl={qrSrc /* طباعة نفس الـ QR على الإيصال (اختياري) */}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
