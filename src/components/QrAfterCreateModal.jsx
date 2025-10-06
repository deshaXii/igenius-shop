// src/components/QrAfterCreateModal.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import RepairReceipt from "./RepairReceipt";
import API from "../lib/api"; // لاستخدام baseURL وجلب الإعدادات

export default function QrAfterCreateModal({
  open,
  onClose,
  trackingUrl,
  repair,
  qrDataUrl, // اختياري: لو موصول جاهز من الخارج
}) {
  const [qrData, setQrData] = useState("");
  const receiptRef = useRef(null); // للإيصال فقط (ref واحد للإيصال)
  const [isCopying, setIsCopying] = useState(false);

  /* ================= إعدادات قادمة من /settings ================= */
  const [phones, setPhones] = useState([]); // أرقام التواصل
  const [socialLinks, setSocialLinks] = useState([]); // [{platform, url}]
  const [receiptMessage, setReceiptMessage] = useState(""); // رسالة أسفل "يُرجى إحضار..."
  const [receiptFontSizePt, setReceiptFontSizePt] = useState(12); // حجم خط الطباعة الحرارية
  const [receiptPaperWidthMm, setReceiptPaperWidthMm] = useState(80); // عرض الورقة (58/80mm)
  const [receiptMarginMm, setReceiptMarginMm] = useState(5); // الهامش (mm)

  /* ===== baseURL + token لتوليد روابط صور الـQR للسوشيال من السيرفر ===== */
  const API_BASE =
    (API && API.defaults && API.defaults.baseURL
      ? String(API.defaults.baseURL)
      : "") || "";
  const API_BASE_TRIM = API_BASE.replace(/\/$/, "");
  const ORIGIN =
    typeof window !== "undefined" ? window.location.origin : "";
  // fallback لو baseURL مش متضبوطة
  const BASE_URL = API_BASE_TRIM || ORIGIN;

  const token = (() => {
    try {
      return localStorage.getItem("token") || "";
    } catch {
      return "";
    }
  })();
  const socialQrSrc = (idx) =>
    `${BASE_URL}/settings/social/${idx}/qr.svg?token=${encodeURIComponent(
      token
    )}`;

  /* ================= توليد QR (كما هو بالضبط) ================= */
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

  /* ================= جلب الإعدادات عند فتح المودال ================= */
  useEffect(() => {
    let stop = false;
    async function loadSettings() {
      try {
        const s = await API.get("/settings").then((r) => r.data || {});
        if (stop) return;
        setPhones(Array.isArray(s.phoneNumbers) ? s.phoneNumbers : []);
        setSocialLinks(Array.isArray(s.socialLinks) ? s.socialLinks : []);
        setReceiptMessage(s.receiptMessage || "");
        setReceiptFontSizePt(Number(s.receiptFontSizePt || 12));
        setReceiptPaperWidthMm(Number(s.receiptPaperWidthMm || 80));
        setReceiptMarginMm(Number(s.receiptMarginMm || 5));
      } catch {
        // تجاهل الخطأ؛ لا نكسر الطباعة لو فشل الجلب
      }
    }
    if (open) loadSettings();
    return () => {
      stop = true;
    };
  }, [open]);

  if (!open) return null;

  const ticketNo =
    repair?.serial ||
    repair?.code ||
    (repair?._id ? String(repair._id).slice(-6) : "");

  /* ================= أدوات مساعدة للطباعة ================= */
  const printViaIframe = (htmlBody, title = "Print") => {
    // تطبيق إعدادات الطابعة الحرارية
    const width = Math.max(40, Math.min(120, Number(receiptPaperWidthMm) || 80));
    const margin = Math.max(0, Math.min(20, Number(receiptMarginMm) || 5));
    const fontPt = Math.max(8, Math.min(24, Number(receiptFontSizePt) || 12));

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
            @page { size: ${width}mm auto; margin: ${margin}mm; }
            html, body { margin:0; padding:0; }
            body {
              font-size: ${fontPt}pt;
              line-height: 1.35;
              font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Noto Naskh Arabic", "Noto Kufi Arabic", Tahoma, Arial;
            }
            .grid { display: grid; gap: 8px; }
            .phones { font-size: 12px; }
            .phones b { font-size: 12px; }
            .qrs { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px,1fr)); gap: 8px; }
            .qrCard { border: 1px solid #ddd; border-radius: 8px; padding: 6px; text-align: center; }
            .qrCard img { width: 100px; height: 100px; display: block; margin: 4px auto; background: #fff; }
            .muted { opacity: .8; font-size: 11px; }
            .sectionTitle { font-weight: 700; margin: 8px 0 4px; }
            hr { border: 0; border-top: 1px dashed #bbb; margin: 6px 0; }
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

  // (كما هو) نسخ رابط التتبّع — غير مستخدم افتراضًا بس ما نحذفه
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

  /* ================= طباعة الإيصال (الشكل القديم + الإضافات) ================= */
  const handlePrintReceipt = () => {
    const src = receiptRef.current;
    if (!src) return console.warn("receiptRef is empty");

    // خُد نسخة ثابتة من الإيصال (لا تعتمد على نفس عقدة DOM الأصلية)
    const clone = src.cloneNode(true);

    // إضافة كتلة (أرقام + QR السوشيال) أسفل الإيصال — بدون تغيير شكل الإيصال نفسه
    const extra = document.createElement("div");
    extra.innerHTML = `
      <hr />
      <div class="grid">
        ${
          phones && phones.length
            ? `<div class="phones">
                 <div class="sectionTitle">أرقام التواصل</div>
                 <div>${phones
                   .map(
                     (p, i) =>
                       `<div><b>(${i + 1})</b> <span class="muted" dir="ltr">${String(
                         p
                       )}</span></div>`
                   )
                   .join("")}</div>
               </div>`
            : ""
        }
        ${
          socialLinks && socialLinks.length
            ? `<div>
                 <div class="sectionTitle">روابط السوشيال (QR)</div>
                 <div class="qrs">
                   ${socialLinks
                     .map((s, i) => {
                       const label = s.platform || "Social";
                       const qr = socialQrSrc(i);
                       return `<div class="qrCard">
                         <div class="muted">${label}</div>
                         <img src="${qr}" alt="QR" />
                       </div>`;
                     })
                     .join("")}
                 </div>
               </div>`
            : ""
        }
      </div>
    `;

    const wrapper = document.createElement("div");
    wrapper.appendChild(clone);
    wrapper.appendChild(extra);

    printViaIframe(wrapper.outerHTML, "إيصال الاستلام");
  };

  /* ================= طباعة ملصق الـ QR (اختياري كما كان) ================= */
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

  /* ================= الواجهة (نفس الشكل القديم) ================= */
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

        {/* Actions — الشكل القديم محفوظ */}
        <div className="flex flex-wrap items-center gap-2 justify-end">
          {/* 
          <button
            className="px-3 py-2 rounded-xl bg-emerald-600 text-white"
            onClick={handlePrintLabel}
            disabled={!qrSrc}
            title="طباعة ملصق الـ QR"
          >
            طباعة ملصق
          </button> */}

          {/* <button
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
          </a> */}
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
          {/* نسخة مخفية للإيصال — كما كانت */}
          <div style={{ position: "fixed", left: -9999, top: -9999 }}>
            <div ref={receiptRef}>
              <RepairReceipt
                shopName="IGenius"
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
                receiptMessage={receiptMessage /* رسالة الإيصال المخصصة */}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
