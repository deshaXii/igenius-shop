import getTrackingUrl from "./GetTrackingUrl";

// ======== رسالة واتساب ========
export default function HandleWhatsAppMessage(rep) {
  if (!rep?.phone) {
    alert("لا يوجد رقم هاتف للعميل.");
    return;
  }
  const digits = String(rep.phone).replace(/\D+/g, "");
  const normalized = digits.replace(/^0+/, "");
  const phoneE164 = `20${normalized}`;

  const partsSummary = (rep.parts || [])
    .map(
      (p) =>
        `- ${p.name || "قطعة"}${
          Number.isFinite(p.cost) ? ` (${Math.round(p.cost)}ج)` : ""
        }`
    )
    .join("%0A");

  const warrantyLine =
    rep?.hasWarranty && rep?.warrantyEnd
      ? `الضمان حتى ${formatDate(rep.warrantyEnd)}`
      : "بدون تاريخ ضمان محدد";

  const track = getTrackingUrl(rep);

  const msg = [
    `أهلاً ${rep.customerName || "عميلنا الكريم"} 👋`,
    `يسعدنا إبلاغك أن جهازك (${rep.deviceType || "الجهاز"}) أصبح ${
      rep.status === "تم التسليم" ? "جاهزًا وتم تسليمه" : "جاهزًا"
    } ✅`,
    `العطل: ${rep.issue || "—"}`,
    `السعر النهائي: ${
      hasNum(rep.finalPrice)
        ? Number(rep.finalPrice)
        : hasNum(rep.price)
        ? Number(rep.price)
        : "—"
    } جنيه`,
    `القطع المستخدمة:%0A${partsSummary || "- لا توجد قطع"}`,
    `الضمان: ${warrantyLine}`,
    track ? `رابط تتبّع/تفاصيل الصيانة: ${track}` : null,
    "",
    "نطمح لمعرفة مدى رضاك عن الخدمة. لو عندك أي ملاحظات أو احتجت مساعدة احنا موجودين دايمًا 🌟",
    SHOP.name,
  ]
    .filter(Boolean)
    .join("%0A");

  const url = `https://wa.me/${phoneE164}?text=${msg}`;
  window.open(url, "_blank");
}
