// src/features/settings/SettingsPage.jsx
import { useEffect, useMemo, useState } from "react";
import API from "../../lib/api";

function cls(...x) {
  return x.filter(Boolean).join(" ");
}

function safeNum(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function dateOnly(isoOrDate) {
  if (!isoOrDate) return "";
  const s = String(isoOrDate);
  // لو جاي ISO هنأخذ أول 10
  if (s.length >= 10 && s[4] === "-" && s[7] === "-") return s.slice(0, 10);
  const d = new Date(isoOrDate);
  if (!Number.isFinite(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateInput(val) {
  // نرسلها كـ YYYY-MM-DD (Node هيفسرها UTC midnight)
  return val ? String(val).trim() : "";
}

function addDays(dateObj, days) {
  const d = new Date(dateObj);
  d.setDate(d.getDate() + days);
  return d;
}

function addYears(dateObj, years) {
  const d = new Date(dateObj);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

function diffDays(a, b) {
  // ceil فرق الأيام
  const ms = b.getTime() - a.getTime();
  const day = 24 * 60 * 60 * 1000;
  return Math.ceil(ms / day);
}

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return "—";
    return d.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function normalizeUrl(u) {
  const url = String(u || "").trim();
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url.replace(/^\/+/, "")}`;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [toast, setToast] = useState({ type: "", text: "" });

  // General
  const [defaultPct, setDefaultPct] = useState(50);

  // Phones & Social
  const [phones, setPhones] = useState([""]);
  const [social, setSocial] = useState([{ platform: "", url: "" }]);

  // Receipt
  const [receiptMessage, setReceiptMessage] = useState("");
  const [receiptFontSizePt, setReceiptFontSizePt] = useState(12);
  const [receiptPaperWidthMm, setReceiptPaperWidthMm] = useState(80);
  const [receiptMarginMm, setReceiptMarginMm] = useState(5);

  // Subscription
  const [planName, setPlanName] = useState("Yearly");
  const [subStart, setSubStart] = useState(""); // YYYY-MM-DD
  const [subEnd, setSubEnd] = useState(""); // YYYY-MM-DD
  const [savingSub, setSavingSub] = useState(false);

  // Technicians list
  const [techs, setTechs] = useState([]);
  const [savingTech, setSavingTech] = useState(null);

  // QR sources
  const API_BASE =
    (API && API.defaults && API.defaults.baseURL
      ? String(API.defaults.baseURL)
      : "") || "";
  const API_BASE_TRIM = API_BASE.replace(/\/$/, "");
  const token = (() => {
    try {
      return localStorage.getItem("token") || "";
    } catch {
      return "";
    }
  })();
  const socialQrSrc = (idx) =>
    `${API_BASE_TRIM}/settings/social/${idx}/qr.svg?token=${encodeURIComponent(
      token
    )}`;

  function flash(type, text) {
    setToast({ type, text });
    window.clearTimeout(flash._t);
    flash._t = window.setTimeout(() => setToast({ type: "", text: "" }), 2500);
  }

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const s = await API.get("/settings").then((r) => r.data);

      setDefaultPct(s?.defaultTechCommissionPct ?? 50);

      setPhones(
        Array.isArray(s?.phoneNumbers) && s.phoneNumbers.length
          ? s.phoneNumbers
          : [""]
      );
      setSocial(
        Array.isArray(s?.socialLinks) && s.socialLinks.length
          ? s.socialLinks
          : [{ platform: "", url: "" }]
      );

      setReceiptMessage(s?.receiptMessage || "");
      setReceiptFontSizePt(Number(s?.receiptFontSizePt || 12));
      setReceiptPaperWidthMm(Number(s?.receiptPaperWidthMm || 80));
      setReceiptMarginMm(Number(s?.receiptMarginMm || 5));

      // Subscription
      setPlanName(s?.subscription?.planName || "Yearly");
      setSubStart(dateOnly(s?.subscription?.startAt));
      setSubEnd(dateOnly(s?.subscription?.endAt));

      const t = await API.get("/technicians").then((r) => r.data || []);
      setTechs(t);
    } catch (e) {
      setErr(e?.response?.data?.message || "تعذر تحميل الإعدادات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveDefault() {
    try {
      await API.put("/settings", {
        defaultTechCommissionPct: Number(defaultPct),
      });
      flash("success", "تم حفظ النسبة الافتراضية");
    } catch (e) {
      flash("error", e?.response?.data?.message || "خطأ أثناء الحفظ");
    }
  }

  async function savePhones() {
    try {
      const clean = phones.map((p) => String(p || "").trim()).filter(Boolean);
      await API.put("/settings/phones", { phoneNumbers: clean });
      flash("success", "تم حفظ أرقام الهواتف");
    } catch (e) {
      flash("error", e?.response?.data?.message || "خطأ أثناء الحفظ");
    }
  }

  async function saveSocial() {
    try {
      const clean = social
        .map((x) => ({
          platform: String(x.platform || "").trim(),
          url: String(x.url || "").trim(),
        }))
        .filter((x) => x.platform && x.url);

      await API.put("/settings/social", { socialLinks: clean });
      flash("success", "تم حفظ روابط السوشيال");
    } catch (e) {
      flash("error", e?.response?.data?.message || "خطأ أثناء الحفظ");
    }
  }

  async function saveReceipt() {
    try {
      await API.put("/settings/receipt", {
        receiptMessage,
        receiptFontSizePt: Number(receiptFontSizePt),
        receiptPaperWidthMm: Number(receiptPaperWidthMm),
        receiptMarginMm: Number(receiptMarginMm),
      });
      flash("success", "تم حفظ إعدادات الإيصال");
    } catch (e) {
      flash("error", e?.response?.data?.message || "خطأ أثناء الحفظ");
    }
  }

  async function saveSubscription() {
    try {
      setSavingSub(true);
      const payload = {
        planName: String(planName || "Yearly").trim() || "Yearly",
        startAt: parseDateInput(subStart),
        endAt: parseDateInput(subEnd),
      };
      const pass = window.prompt("أدخل كلمة مرور تعديل الاشتراك:");
      if (!pass) return;

      await API.put(
        "/settings/subscription",
        payload,
        { headers: { "x-subscription-passcode": pass } }
      );

      flash("success", "تم حفظ بيانات الاشتراك");
      await load();
    } catch (e) {
      flash("error", e?.response?.data?.message || "خطأ أثناء حفظ الاشتراك");
    } finally {
      setSavingSub(false);
    }
  }

  async function saveTechPct(id, pct) {
    try {
      setSavingTech(id);
      await API.put(`/settings/technicians/${id}/commission`, {
        commissionPct: Number(pct),
      });
      flash("success", "تم حفظ نسبة الفني");
    } catch (e) {
      flash("error", e?.response?.data?.message || "خطأ");
    } finally {
      setSavingTech(null);
    }
  }

  function setPhoneAt(i, val) {
    setPhones((arr) => {
      const A = arr.slice();
      A[i] = val;
      return A;
    });
  }
  function addPhone() {
    setPhones((arr) => [...arr, ""]);
  }
  function removePhone(i) {
    setPhones((arr) => arr.filter((_, idx) => idx !== i));
  }

  function setSocialAt(i, key, val) {
    setSocial((arr) => {
      const A = arr.slice();
      A[i] = { ...A[i], [key]: val };
      return A;
    });
  }
  function addSocial() {
    setSocial((arr) => [...arr, { platform: "", url: "" }]);
  }
  function removeSocial(i) {
    setSocial((arr) => arr.filter((_, idx) => idx !== i));
  }

  const previewStyles = useMemo(() => {
    const w = Math.max(40, Math.min(120, safeNum(receiptPaperWidthMm, 80)));
    const m = Math.max(0, Math.min(20, safeNum(receiptMarginMm, 5)));
    const f = Math.max(8, Math.min(24, safeNum(receiptFontSizePt, 12)));
    return {
      width: `${w}mm`,
      padding: `${m}mm`,
      fontSize: `${f}pt`,
      lineHeight: 1.35,
    };
  }, [receiptPaperWidthMm, receiptMarginMm, receiptFontSizePt]);

  // ===== Subscription computed =====
  const subInfo = useMemo(() => {
    const now = new Date();
    const start = subStart ? new Date(`${subStart}T00:00:00Z`) : null;
    const end = subEnd ? new Date(`${subEnd}T00:00:00Z`) : null;

    if (
      !start ||
      !end ||
      !Number.isFinite(start.getTime()) ||
      !Number.isFinite(end.getTime())
    ) {
      return {
        ok: false,
        status: "غير مضبوط",
        badge: "bg-amber-100 text-amber-800",
        text: "لم يتم ضبط تواريخ الاشتراك بعد.",
        remainingDays: null,
        nextRenewal: null,
      };
    }

    if (now.getTime() < start.getTime()) {
      const daysToStart = diffDays(now, start);
      const totalRemaining = diffDays(now, end);
      return {
        ok: true,
        status: "لم يبدأ بعد",
        badge: "bg-amber-100 text-amber-800",
        text: `سيبدأ بعد ${daysToStart} يوم`,
        remainingDays: totalRemaining,
        nextRenewal: end,
      };
    }

    if (now.getTime() >= start.getTime() && now.getTime() < end.getTime()) {
      const remaining = diffDays(now, end);
      return {
        ok: true,
        status: "نشط",
        badge: "bg-emerald-100 text-emerald-800",
        text: `متبقي ${remaining} يوم`,
        remainingDays: remaining,
        nextRenewal: end,
      };
    }

    const daysPassed = diffDays(end, now);
    return {
      ok: true,
      status: "منتهي",
      badge: "bg-rose-100 text-rose-800",
      text: `منتهي منذ ${daysPassed} يوم`,
      remainingDays: 0,
      nextRenewal: end,
    };
  }, [subStart, subEnd]);

  function setTomorrowOneYear() {
    const now = new Date();
    const tomorrow = addDays(now, 1);
    // تاريخ فقط
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const dd = String(tomorrow.getDate()).padStart(2, "0");
    const startStr = `${yyyy}-${mm}-${dd}`;

    const end = addYears(new Date(`${startStr}T00:00:00Z`), 1);
    const endStr = dateOnly(end.toISOString());

    setSubStart(startStr);
    setSubEnd(endStr);
  }

  function renewOneYearFromEnd() {
    if (!subEnd) return;
    const currentEnd = new Date(`${subEnd}T00:00:00Z`);
    if (!Number.isFinite(currentEnd.getTime())) return;
    const newStart = dateOnly(currentEnd.toISOString());
    const newEnd = dateOnly(addYears(currentEnd, 1).toISOString());
    setSubStart(newStart);
    setSubEnd(newEnd);
  }

  if (loading) return <div className="p-4">جارِ التحميل...</div>;
  if (err)
    return (
      <div className="p-3 rounded-2xl bg-rose-50 text-rose-800 border border-rose-100">
        {err}
      </div>
    );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">الإعدادات</h1>
          <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">
            إدارة الاشتراك، بيانات التواصل، الإيصال، ونِسَب الفنيين من مكان
            واحد.
          </p>
        </div>

        {toast.text && (
          <div
            className={cls(
              "px-3 py-2 rounded-2xl text-sm font-semibold border",
              toast.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-100"
                : "bg-rose-50 text-rose-800 border-rose-100"
            )}
          >
            {toast.text}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Subscription */}
          <Card
            title="الاشتراك"
            desc="حدد بداية ونهاية الاشتراك السنوي، وسيظهر لك المتبقي وتاريخ التجديد القادم."
            right={
              <span
                className={cls(
                  "px-3 py-1 rounded-full text-xs font-semibold",
                  subInfo.badge
                )}
              >
                {subInfo.status}
              </span>
            }
          >
            <div className="grid md:grid-cols-3 gap-3">
              <Field label="اسم الخطة (اختياري)">
                <input
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Yearly"
                />
              </Field>

              <Field label="تاريخ بداية الاشتراك">
                <input
                  type="date"
                  value={subStart}
                  onChange={(e) => setSubStart(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>

              <Field label="تاريخ نهاية الاشتراك (التجديد القادم)">
                <input
                  type="date"
                  value={subEnd}
                  onChange={(e) => setSubEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>
            </div>

            <div className="mt-3 grid sm:grid-cols-2 gap-3">
              <MiniStat label="الحالة">{subInfo.text}</MiniStat>
              <MiniStat label="تاريخ التجديد القادم">
                {subInfo.nextRenewal ? fmtDate(subInfo.nextRenewal) : "—"}
              </MiniStat>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={setTomorrowOneYear}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-sm font-semibold"
              >
                بدء من الغد لمدة سنة
              </button>

              <button
                type="button"
                onClick={renewOneYearFromEnd}
                disabled={!subEnd}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-sm font-semibold disabled:opacity-50"
              >
                تجديد سنة (من تاريخ النهاية)
              </button>

              <button
                type="button"
                onClick={saveSubscription}
                disabled={savingSub || !subStart || !subEnd}
                className="ms-auto px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:opacity-95 disabled:opacity-60"
              >
                {savingSub ? "جارِ الحفظ..." : "حفظ الاشتراك"}
              </button>
            </div>
          </Card>

          {/* Contact */}
          <Card
            title="بيانات التواصل"
            desc="أرقام الهاتف وروابط السوشيال التي ستظهر في صفحات عامة مثل التتبع."
          >
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Phones */}
              <div className="rounded-2xl border border-slate-200 dark:border-gray-700 p-3 bg-slate-50/60 dark:bg-gray-900/40">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold">أرقام الهاتف</div>
                  <button
                    type="button"
                    onClick={addPhone}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
                  >
                    + إضافة
                  </button>
                </div>

                <div className="space-y-2">
                  {phones.map((p, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        value={p}
                        onChange={(e) => setPhoneAt(i, e.target.value)}
                        placeholder={`رقم #${i + 1}`}
                        className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => removePhone(i)}
                        className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-gray-800 text-sm font-semibold"
                      >
                        حذف
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={savePhones}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold"
                  >
                    حفظ الأرقام
                  </button>
                </div>
              </div>

              {/* Social */}
              <div className="rounded-2xl border border-slate-200 dark:border-gray-700 p-3 bg-slate-50/60 dark:bg-gray-900/40">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold">روابط السوشيال</div>
                  <button
                    type="button"
                    onClick={addSocial}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
                  >
                    + إضافة
                  </button>
                </div>

                <div className="space-y-2">
                  {social.map((s, i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2"
                    >
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <input
                          value={s.platform}
                          onChange={(e) =>
                            setSocialAt(i, "platform", e.target.value)
                          }
                          placeholder="المنصة (Facebook)"
                          className="col-span-4 px-3 py-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          value={s.url}
                          onChange={(e) =>
                            setSocialAt(i, "url", e.target.value)
                          }
                          placeholder="https://..."
                          className="col-span-8 px-3 py-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => removeSocial(i)}
                          className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-gray-800 text-sm font-semibold"
                        >
                          حذف
                        </button>

                        {s.url ? (
                          <>
                            <a
                              href={normalizeUrl(s.url)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold text-blue-600 hover:underline"
                            >
                              فتح الرابط
                            </a>

                            <div className="ms-auto">
                              <img
                                src={socialQrSrc(i)}
                                alt="QR"
                                className="w-14 h-14 bg-white rounded-xl border border-slate-200 dark:border-gray-700"
                              />
                            </div>
                          </>
                        ) : (
                          <div className="ms-auto text-xs text-slate-500">
                            أدخل رابطًا لعرض QR
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={saveSocial}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold"
                  >
                    حفظ الروابط
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* Default tech commission */}
          <Card
            title="النسبة الافتراضية للفنيين"
            desc="تُستخدم كنسبة افتراضية عند عدم تحديد نسبة مخصصة لفني."
          >
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                value={defaultPct}
                onChange={(e) => setDefaultPct(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 w-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-semibold">%</span>

              <button
                type="button"
                onClick={saveDefault}
                className="ms-auto px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold"
              >
                حفظ
              </button>
            </div>
          </Card>

          {/* Receipt */}
          <Card
            title="إعدادات الإيصال الحراري"
            desc="تخصيص الورقة والهامش وحجم الخط والرسالة أسفل الإيصال."
          >
            <div className="grid md:grid-cols-3 gap-3">
              <Field label="حجم الخط (pt)">
                <input
                  type="number"
                  min="8"
                  max="24"
                  value={receiptFontSizePt}
                  onChange={(e) => setReceiptFontSizePt(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>

              <Field label="عرض الورقة (mm)">
                <input
                  type="number"
                  min="40"
                  max="120"
                  value={receiptPaperWidthMm}
                  onChange={(e) => setReceiptPaperWidthMm(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="text-xs text-slate-500 mt-1">
                  شائع: 58mm أو 80mm
                </div>
              </Field>

              <Field label="الهوامش (mm)">
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={receiptMarginMm}
                  onChange={(e) => setReceiptMarginMm(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>
            </div>

            <div className="mt-3">
              <label className="block mb-1 text-sm font-semibold">
                رسالة أسفل الإيصال
              </label>
              <textarea
                rows={4}
                value={receiptMessage}
                onChange={(e) => setReceiptMessage(e.target.value)}
                placeholder="مثال: في حال عدم الاستلام خلال 30 يومًا قد يتم تصفية الجهاز..."
                className="w-full px-3 py-2 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">معاينة</div>
              <button
                type="button"
                onClick={saveReceipt}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold"
              >
                حفظ إعدادات الإيصال
              </button>
            </div>

            <div
              className="mt-2 rounded-2xl border border-dashed border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-950"
              style={{ ...previewStyles }}
            >
              <div className="text-center font-bold">IGenius</div>
              <div className="text-sm opacity-70 text-center">
                إيصال استلام — نموذج
              </div>
              <hr style={{ margin: "8px 0", borderTop: "1px dashed #bbb" }} />
              <div className="text-xs">يُرجى إحضار هذه الورقة عند الاستلام</div>
              {receiptMessage ? (
                <div className="text-xs mt-1">{receiptMessage}</div>
              ) : null}
              <hr style={{ margin: "8px 0", borderTop: "1px dashed #bbb" }} />
              <div className="text-[10px] opacity-70">
                * هذه معاينة تقريبية. الشكل الفعلي يعتمد على إعدادات الطابعة.
              </div>
            </div>
          </Card>

          {/* Tech commission overrides */}
          <Card
            title="نِسَب مخصصة لفنيين"
            desc="خصص نسبة لفني معين بدل النسبة الافتراضية."
          >
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2">
              {techs.map((t) => (
                <TechCard
                  key={t._id}
                  tech={t}
                  onSave={saveTechPct}
                  saving={savingTech === t._id}
                />
              ))}
            </div>
          </Card>
        </div>

        {/* Side summary */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-3xl bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 shadow-sm p-4">
            <div className="text-sm font-semibold mb-2">ملخص سريع</div>

            <div className="space-y-2">
              <SummaryRow label="حالة الاشتراك">
                <span
                  className={cls(
                    "px-2 py-0.5 rounded-full text-xs font-semibold",
                    subInfo.badge
                  )}
                >
                  {subInfo.status}
                </span>
              </SummaryRow>

              <SummaryRow label="بداية الاشتراك">
                {subStart ? fmtDate(subStart) : "—"}
              </SummaryRow>
              <SummaryRow label="نهاية الاشتراك">
                {subEnd ? fmtDate(subEnd) : "—"}
              </SummaryRow>
              <SummaryRow label="التجديد القادم">
                {subInfo.nextRenewal ? fmtDate(subInfo.nextRenewal) : "—"}
              </SummaryRow>
            </div>

            <div className="mt-3 text-xs text-slate-500 dark:text-slate-300">
              ملاحظة: الاشتراك السنوي موثق داخل Settings لتقدر تراجعه لاحقًا في
              أي وقت.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, desc, right, children }) {
  return (
    <section className="rounded-3xl bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="p-4 md:p-5 border-b border-slate-100 dark:border-gray-800 flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base md:text-lg font-bold">{title}</h2>
          </div>
          {desc ? (
            <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">
              {desc}
            </p>
          ) : null}
        </div>
        {right ? <div className="mt-0.5">{right}</div> : null}
      </div>
      <div className="p-4 md:p-5">{children}</div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-sm font-semibold mb-1">{label}</div>
      {children}
    </div>
  );
}

function MiniStat({ label, children }) {
  return (
    <div className="rounded-2xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 p-3">
      <div className="text-xs text-slate-500 dark:text-slate-300 font-semibold">
        {label}
      </div>
      <div className="mt-1 text-sm font-bold">{children}</div>
    </div>
  );
}

function SummaryRow({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-slate-600 dark:text-slate-300">{label}</span>
      <span className="font-semibold">{children}</span>
    </div>
  );
}

function TechCard({ tech, onSave, saving }) {
  const [pct, setPct] = useState(
    typeof tech.commissionPct === "number" ? tech.commissionPct : ""
  );
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-950/40 p-3">
      <div className="font-bold text-sm">
        {tech.name}{" "}
        <span className="opacity-70 font-semibold">(@{tech.username})</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          min="0"
          max="100"
          placeholder="افتراضي"
          value={pct}
          onChange={(e) => setPct(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-sm font-semibold">%</span>
        <button
          type="button"
          onClick={() => onSave(tech._id, pct === "" ? 50 : pct)}
          disabled={saving}
          className="ms-auto px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
        >
          {saving ? "..." : "حفظ"}
        </button>
      </div>
    </div>
  );
}
