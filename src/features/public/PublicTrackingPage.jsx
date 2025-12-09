// src/features/public/PublicTrackingPage.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../../lib/api";

function fmt(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "—";
  }
}

const STATUS_COLOR = {
  "في الانتظار": "bg-amber-100 text-amber-800",
  "جاري العمل": "bg-emerald-100 text-emerald-800",
  مكتمل: "bg-blue-100 text-blue-800",
  "تم التسليم": "bg-blue-200 text-blue-900",
  مرفوض: "bg-red-100 text-red-800",
  مرتجع: "bg-purple-100 text-purple-800",
};

const RATING_LABELS = {
  1: "سيئة",
  2: "مقبولة",
  3: "جيدة",
  4: "جيدة جدًا",
  5: "ممتازة",
};

function normalizePhoneForWhatsApp(phone) {
  return String(phone || "").replace(/\D+/g, "");
}

export default function PublicTrackingPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  // تقييم العميل
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [note, setNote] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState("idle"); // idle | saving | done | error
  const [feedbackErr, setFeedbackErr] = useState("");

  async function load() {
    setErr("");
    try {
      const { data: payload } = await API.get(`/public/repairs/${token}`);
      setData(payload);

      // لو فيه تقييم متسجل من قبل في الـ API
      const fb =
        payload.feedback ||
        payload.repair?.feedback ||
        payload.repair?.customerFeedback;
      const hasLocal = rating > 0 || note.trim().length > 0;

      if (fb && !hasLocal) {
        setRating(Number(fb.rating || 0));
        setNote(fb.note || "");
        setFeedbackStatus("done");
      }
    } catch (e) {
      setErr("تعذر تحميل بيانات التتبّع");
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function submitFeedback(e) {
    e.preventDefault();
    if (!rating && !note.trim()) return;

    setFeedbackStatus("saving");
    setFeedbackErr("");

    try {
      await API.post(`/public/repairs/${token}/feedback`, {
        rating,
        note: note.trim(),
      });
      setFeedbackStatus("done");
    } catch (e) {
      setFeedbackStatus("error");
      setFeedbackErr(
        e?.response?.data?.message ||
          "حدث خطأ أثناء إرسال تقييمك، حاول مرة أخرى."
      );
    }
  }

  const displayRating = hoverRating || rating;

  if (err) {
    return (
      <div
        dir="rtl"
        className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-950 px-4"
      >
        <div className="max-w-md w-full rounded-2xl bg-white dark:bg-gray-900 border border-rose-100 dark:border-rose-900/60 p-5 text-center space-y-3">
          <div className="text-sm font-semibold text-rose-600">{err}</div>
          <button
            type="button"
            onClick={load}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        dir="rtl"
        className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-950 text-sm text-slate-600"
      >
        جارِ تحميل بيانات الصيانة…
      </div>
    );
  }

  const r = data.repair || {};
  const shop = data.shop || {};

  const statusChip =
    STATUS_COLOR[r.status] ||
    "bg-gray-100 text-gray-800 border border-white/30";

  const phoneNumbers = Array.isArray(shop.phoneNumbers)
    ? shop.phoneNumbers
    : shop.phone
    ? [shop.phone]
    : [];
  const primaryPhone = phoneNumbers[0];
  const whatsappNumber = shop.whatsapp || primaryPhone;
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${normalizePhoneForWhatsApp(whatsappNumber)}`
    : null;

  const socialLinks = Array.isArray(shop.socialLinks) ? shop.socialLinks : [];

  const disabledFeedback =
    feedbackStatus === "saving" || feedbackStatus === "done";

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-slate-50"
    >
      <div className="max-w-4xl mx-auto px-3 py-6 md:py-10 space-y-4 md:space-y-6">
        {/* كارت الهيدر + تفاصيل الصيانة + تقييم */}
        <section className="rounded-3xl bg-white dark:bg-gray-900 shadow-sm border border-slate-100 dark:border-gray-800 overflow-hidden">
          {/* هيدر جريدينت */}
          <div className="bg-gradient-to-l from-blue-700 via-indigo-600 to-sky-500 text-white px-4 md:px-6 py-4 md:py-5 flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              {shop.logoUrl ? (
                <img
                  src={shop.logoUrl}
                  alt={shop.name || "الشعار"}
                  className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/10 object-contain shadow-sm"
                />
              ) : (
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/15 flex items-center justify-center text-lg font-bold">
                  {(shop.name || "IG").slice(0, 2)}
                </div>
              )}
              <div className="space-y-1">
                <div className="text-[11px] uppercase tracking-[0.16em] text-white/70">
                  تتبّع حالة جهازك
                </div>
                <h1 className="text-lg md:text-xl font-bold">
                  {shop.name || "مركز صيانة الموبايل"}
                </h1>
                {shop.tagline && (
                  <p className="text-xs md:text-sm text-white/80">
                    {shop.tagline}
                  </p>
                )}
              </div>
            </div>

            <div className="ms-auto flex flex-col items-start md:items-end gap-1 text-xs md:text-sm">
              <div className="opacity-80">
                صيانة{" "}
                <span className="font-semibold">
                  #{r.repairId || r._id || "—"}
                </span>
              </div>
              <div className="font-semibold">
                {r.deviceType || "جهاز غير محدد"}
              </div>
              <span
                className={`inline-flex items-center mt-1 px-3 py-1 rounded-full text-[11px] font-semibold shadow-sm ${statusChip}`}
              >
                {r.status || "—"}
              </span>

              <div className="flex flex-wrap gap-2 mt-2">
                {primaryPhone && (
                  <a
                    href={`tel:${primaryPhone}`}
                    className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-[11px] md:text-xs hover:bg-white/25 transition-colors"
                  >
                    <IconPhone className="w-3.5 h-3.5" />
                    اتصال مباشر
                  </a>
                )}
                {whatsappHref && (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-3 py-1 text-[11px] md:text-xs font-semibold hover:bg-emerald-400 transition-colors"
                  >
                    <IconWhatsapp className="w-3.5 h-3.5" />
                    راسلنا على واتساب
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* شريط بيانات المحل / السوشيال */}
          <div className="px-4 md:px-6 py-3 border-b border-slate-100 dark:border-gray-800 text-[11px] md:text-xs text-slate-600 dark:text-slate-300 flex flex-wrap gap-2 md:gap-4">
            {shop.address && (
              <div className="inline-flex items-center gap-1">
                <IconMapPin className="w-3.5 h-3.5" />
                <span className="font-medium">العنوان:</span>
                <span className="line-clamp-1 md:line-clamp-none">
                  {shop.address}
                </span>
              </div>
            )}
            {shop.workingHours && (
              <div className="inline-flex items-center gap-1">
                <IconClock className="w-3.5 h-3.5" />
                <span className="font-medium">مواعيد العمل:</span>
                <span>{shop.workingHours}</span>
              </div>
            )}
            {socialLinks.length > 0 && (
              <div className="inline-flex items-center gap-1 flex-wrap">
                <span className="font-medium">تابعنا:</span>
                {socialLinks.map((s, i) => (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-[10px] font-medium"
                  >
                    {s.platform || "Social"}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* جسم الكارت: بيانات الصيانة + التقييم */}
          <div className="px-4 md:px-6 py-4 md:py-5 space-y-4">
            {/* تفاصيل الصيانة */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <Info label="تم الاستلام">{fmt(r.createdAt)}</Info>
              <Info label="بدأ العمل">{fmt(r.startTime)}</Info>
              <Info label="اكتملت">{fmt(r.endTime)}</Info>
              <Info label="تم التسليم">{fmt(r.deliveryDate)}</Info>
              <Info label="موعد متوقع">{fmt(r.eta)}</Info>
              <Info label="السعر النهائي">
                {r.finalPrice != null
                  ? `${r.finalPrice} ${shop.currency || ""}`.trim()
                  : "—"}
              </Info>
            </div>

            {r.notesPublic && (
              <div className="mt-1 p-3 rounded-2xl bg-slate-50 dark:bg-gray-800/80 border border-dashed border-slate-200 dark:border-gray-700 text-sm">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-300 mb-1">
                  ملاحظة من مركز الصيانة
                </div>
                <div className="font-medium whitespace-pre-wrap">
                  {r.notesPublic}
                </div>
              </div>
            )}

            {/* تقييم العميل */}
            <div className="mt-2 pt-3 border-t border-dashed border-slate-200 dark:border-gray-700">
              <h3 className="text-sm md:text-base font-semibold mb-1">
                كيف كانت تجربتك معنا؟
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                تقييمك يساعدنا نطوّر الخدمة بشكل أفضل. يمكنك ترك تقييم وملاحظة
                بعد استلام الجهاز أو في أي وقت.
              </p>

              <form
                onSubmit={submitFeedback}
                className="space-y-3 text-sm"
                aria-label="نموذج تقييم الخدمة"
              >
                {/* نجوم التقييم */}
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        disabled={disabledFeedback}
                        onMouseEnter={() =>
                          !disabledFeedback && setHoverRating(star)
                        }
                        onMouseLeave={() =>
                          !disabledFeedback && setHoverRating(0)
                        }
                        onClick={() => !disabledFeedback && setRating(star)}
                        className="p-0.5 md:p-1"
                      >
                        <StarIcon
                          filled={displayRating >= star}
                          className="w-5 h-5 md:w-6 md:h-6"
                        />
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 min-h-[1.25rem]">
                    {displayRating
                      ? RATING_LABELS[displayRating] || ""
                      : "اضغط على النجوم لاختيار تقييمك"}
                  </span>
                </div>

                {/* ملاحظات العميل */}
                <div>
                  <label className="block text-xs mb-1 text-slate-600 dark:text-slate-300">
                    ملاحظاتك (اختياري)
                  </label>
                  <textarea
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="اكتب لنا رأيك في الخدمة أو أي ملاحظات تحب ننتبه لها في المرة القادمة…"
                    disabled={disabledFeedback}
                    className="w-full rounded-2xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {feedbackErr && (
                  <div className="text-xs text-rose-600">{feedbackErr}</div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="submit"
                    disabled={disabledFeedback || (!rating && !note.trim())}
                    className="px-4 py-2 rounded-2xl bg-blue-600 text-white text-xs md:text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {feedbackStatus === "saving"
                      ? "جاري إرسال تقييمك..."
                      : feedbackStatus === "done"
                      ? "تم حفظ تقييمك"
                      : "إرسال التقييم"}
                  </button>
                  {feedbackStatus === "done" && (
                    <span className="text-xs text-emerald-600">
                      شكرًا لك، تم استلام تقييمك بنجاح 🙏
                    </span>
                  )}
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* تحديثات الفني */}
        {data?.repair?.updates?.length > 0 && (
          <section className="rounded-3xl bg-white dark:bg-gray-900 shadow-sm border border-slate-100 dark:border-gray-800 overflow-hidden">
            <div className="px-4 md:px-6 py-3 border-b border-slate-100 dark:border-gray-800">
              <h2 className="text-sm md:text-base font-semibold">
                تحديثات من الفني
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                نعرض لك آخر الرسائل والصور والفيديوهات الخاصة بحالة جهازك.
              </p>
            </div>
            <div className="p-4 md:p-5 space-y-3">
              {data.repair.updates.map((u, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl bg-slate-50 dark:bg-gray-800/80 px-3 py-3 md:px-4 md:py-3"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                      {u.type === "text" ? "رسالة من الفني" : "تحديث من الفني"}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {fmt(u.createdAt)}
                    </span>
                  </div>

                  {u.type === "text" && (
                    <div className="text-sm font-medium whitespace-pre-wrap text-center md:text-right">
                      {u.text}
                    </div>
                  )}

                  {u.type === "image" && (
                    <div className="mt-2 flex justify-center">
                      <img
                        alt="صورة من الفني"
                        src={u.fileUrl}
                        className="max-h-72 w-full md:w-auto rounded-2xl object-contain shadow-sm"
                      />
                    </div>
                  )}

                  {u.type === "video" && (
                    <div className="mt-2">
                      <video
                        controls
                        src={u.fileUrl}
                        className="w-full rounded-2xl"
                      />
                    </div>
                  )}

                  {u.type === "audio" && (
                    <div className="mt-2">
                      <audio controls src={u.fileUrl} className="w-full" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Info({ label, children }) {
  return (
    <div className="p-3 rounded-2xl bg-slate-50/90 dark:bg-gray-800/80 border border-slate-100 dark:border-gray-700">
      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-300 mb-0.5">
        {label}
      </div>
      <div className="text-sm font-semibold text-slate-900 dark:text-slate-50 break-words">
        {children}
      </div>
    </div>
  );
}

/* أيقونات صغيرة للاتصال/الموقع/الوقت/النجوم/واتساب */
function IconPhone({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M17.7 14.1c-.6-.1-1.3.1-1.7.5l-1.1 1.1c-1.8-.9-3.2-2.3-4.1-4.1l1.1-1.1c.5-.5.7-1.1.5-1.7L10.9 5c-.3-.8-1-1.3-1.8-1.3H7.2C6.3 3.7 5.5 4.5 5.5 5.4 5.5 13 11 18.5 18.6 18.5c.9 0 1.7-.8 1.7-1.7v-1.9c0-.9-.6-1.6-1.4-1.8l-1.2-.1z" />
    </svg>
  );
}

function IconWhatsapp({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12.04 2C6.57 2 2.2 6.36 2.2 11.82c0 2.08.6 4.02 1.75 5.72L2 22l4.63-1.88a9.9 9.9 0 0 0 5.41 1.58h.01c5.47 0 9.84-4.36 9.84-9.82C21.9 6.36 17.52 2 12.04 2zm0 17.56a7.7 7.7 0 0 1-3.95-1.09l-.28-.17-2.75 1.12.52-2.93-.19-.3a7.5 7.5 0 0 1-1.14-3.96 7.62 7.62 0 0 1 7.79-7.78 7.58 7.58 0 0 1 7.73 7.78 7.62 7.62 0 0 1-7.73 7.83zm4.24-5.6c-.23-.12-1.37-.68-1.58-.76-.21-.08-.36-.12-.51.12-.15.23-.58.76-.71.92-.13.15-.26.17-.49.06-.23-.12-.95-.35-1.8-1.12-.67-.6-1.12-1.35-1.25-1.57-.13-.23-.01-.35.1-.47.1-.1.23-.26.34-.39.11-.13.15-.23.23-.38.08-.15.04-.29-.02-.41-.06-.12-.51-1.22-.7-1.67-.19-.46-.38-.4-.51-.41l-.43-.01a.83.83 0 0 0-.6.28c-.21.23-.8.78-.8 1.9 0 1.12.82 2.2.93 2.36.11.15 1.6 2.56 3.9 3.49.55.24.98.38 1.31.49.55.17 1.06.14 1.45.09.44-.07 1.37-.56 1.57-1.11.19-.55.19-1.02.13-1.11-.06-.09-.21-.15-.44-.27z" />
    </svg>
  );
}

function IconMapPin({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2C8.7 2 6 4.7 6 8c0 4.2 4.7 9.4 5.6 10.4.2.2.6.2.8 0C13.3 17.4 18 12.2 18 8c0-3.3-2.7-6-6-6zm0 8.5A2.5 2.5 0 1 1 12 5.5a2.5 2.5 0 0 1 0 5z" />
    </svg>
  );
}

function IconClock({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm.5-13h-1v5.2l4.3 2.6.5-.8-3.8-2.3V7z" />
    </svg>
  );
}

function StarIcon({ filled, className = "w-5 h-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      style={{
        color: filled ? "#fbbf24" : "#d4d4d8",
        transition: "color 0.15s ease",
      }}
    >
      <path
        d="M12 3.3 14.4 9l6 .5-4.6 3.9 1.4 5.9L12 16.6 6.8 19.3 8.2 13 3.6 9.5 9.6 9 12 3.3Z"
        strokeWidth="1"
      />
    </svg>
  );
}
