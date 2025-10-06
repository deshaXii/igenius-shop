// src/features/settings/SettingsPage.jsx
import { useEffect, useMemo, useState } from "react";
import API from "../../lib/api";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

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

  // Technicians list
  const [techs, setTechs] = useState([]);
  const [savingTech, setSavingTech] = useState(null);

  // لعرض صور الـ QR الخاصة بروابط السوشيال (اختياري)
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
      await API.put("/settings", { defaultTechCommissionPct: Number(defaultPct) });
      alert("تم حفظ النسبة الافتراضية");
    } catch (e) {
      alert(e?.response?.data?.message || "خطأ");
    }
  }

  async function savePhones() {
    try {
      const clean = phones.map((p) => String(p || "").trim()).filter(Boolean);
      await API.put("/settings/phones", { phoneNumbers: clean });
      alert("تم حفظ أرقام الهواتف");
    } catch (e) {
      alert(e?.response?.data?.message || "خطأ");
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
      alert("تم حفظ روابط السوشيال");
    } catch (e) {
      alert(e?.response?.data?.message || "خطأ");
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
      alert("تم حفظ إعدادات الإيصال");
    } catch (e) {
      alert(e?.response?.data?.message || "خطأ");
    }
  }

  async function saveTechPct(id, pct) {
    try {
      setSavingTech(id);
      await API.put(`/settings/technicians/${id}/commission`, {
        commissionPct: Number(pct),
      });
      alert("تم حفظ نسبة الفني");
    } catch (e) {
      alert(e?.response?.data?.message || "خطأ");
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
    const w = Math.max(40, Math.min(120, Number(receiptPaperWidthMm) || 80));
    const m = Math.max(0, Math.min(20, Number(receiptMarginMm) || 5));
    const f = Math.max(8, Math.min(24, Number(receiptFontSizePt) || 12));
    return {
      width: `${w}mm`,
      padding: `${m}mm`,
      fontSize: `${f}pt`,
      lineHeight: 1.35,
    };
  }, [receiptPaperWidthMm, receiptMarginMm, receiptFontSizePt]);

  if (loading) return <div>جارِ التحميل...</div>;
  if (err)
    return (
      <div className="p-3 rounded-xl bg-rose-50 text-rose-800">{err}</div>
    );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">الإعدادات</h1>

      {/* النسبة الافتراضية للفنيين */}
      <section className="p-3 rounded-xl bg-white dark:bg-gray-800">
        <h2 className="font-semibold mb-2">النسبة الافتراضية للفنيين</h2>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            max="100"
            value={defaultPct}
            onChange={(e) => setDefaultPct(e.target.value)}
            className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 w-28"
          />
        <span>%</span>
          <button
            onClick={saveDefault}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:opacity-90"
          >
            حفظ
          </button>
        </div>
      </section>

      {/* أرقام التليفونات */}
      <section className="p-3 rounded-xl bg-white dark:bg-gray-800 space-y-2">
        <h2 className="font-semibold">أرقام التليفونات</h2>
        <div className="grid md:grid-cols-2 gap-2">
          {phones.map((p, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={p}
                onChange={(e) => setPhoneAt(i, e.target.value)}
                placeholder={`رقم #${i + 1}`}
                className="flex-1 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700"
              />
              <button
                type="button"
                onClick={() => removePhone(i)}
                className="px-3 py-2 rounded-xl bg-gray-200 dark:bg-gray-700"
              >
                حذف
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={addPhone}
            className="px-3 py-2 rounded-xl bg-emerald-600 text-white"
          >
            + إضافة رقم
          </button>
          <button
            type="button"
            onClick={savePhones}
            className="px-3 py-2 rounded-xl bg-blue-600 text-white"
          >
            حفظ الأرقام
          </button>
        </div>
      </section>

      {/* روابط السوشيال + معاينة QR صغيرة */}
      <section className="p-3 rounded-xl bg-white dark:bg-gray-800 space-y-2">
        <h2 className="font-semibold">روابط السوشيال</h2>
        <div className="grid md:grid-cols-2 gap-2">
          {social.map((s, i) => (
            <div key={i} className="grid grid-cols-5 gap-2 items-start">
              <input
                value={s.platform}
                onChange={(e) => setSocialAt(i, "platform", e.target.value)}
                placeholder="المنصة (Facebook)"
                className="col-span-2 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700"
              />
              <input
                value={s.url}
                onChange={(e) => setSocialAt(i, "url", e.target.value)}
                placeholder="https://..."
                className="col-span-3 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700"
              />
              <div className="col-span-5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => removeSocial(i)}
                  className="px-3 py-2 rounded-xl bg-gray-200 dark:bg-gray-700"
                >
                  حذف
                </button>

                {/* معاينة QR (اختيارية) */}
                <div className="ms-auto">
                  {s.url ? (
                    <img
                      src={socialQrSrc(i)}
                      alt="QR"
                      className="w-16 h-16 bg-white rounded border border-gray-300 dark:border-gray-700"
                    />
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={addSocial}
            className="px-3 py-2 rounded-xl bg-emerald-600 text-white"
          >
            + إضافة رابط
          </button>
          <button
            type="button"
            onClick={saveSocial}
            className="px-3 py-2 rounded-xl bg-blue-600 text-white"
          >
            حفظ الروابط
          </button>
        </div>
      </section>

      {/* إعدادات الإيصال الحراري + معاينة بسيطة */}
      <section className="p-3 rounded-xl bg-white dark:bg-gray-800 space-y-3">
        <h2 className="font-semibold">إعدادات الإيصال الحراري</h2>

        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="block mb-1 text-sm">حجم الخط (pt)</label>
            <input
              type="number"
              min="8"
              max="24"
              value={receiptFontSizePt}
              onChange={(e) => setReceiptFontSizePt(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm">عرض الورقة (mm)</label>
            <input
              type="number"
              min="40"
              max="120"
              value={receiptPaperWidthMm}
              onChange={(e) => setReceiptPaperWidthMm(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700"
            />
            <div className="text-xs opacity-70 mt-1">شائع: 58mm أو 80mm</div>
          </div>
          <div>
            <label className="block mb-1 text-sm">الهوامش (mm)</label>
            <input
              type="number"
              min="0"
              max="20"
              value={receiptMarginMm}
              onChange={(e) => setReceiptMarginMm(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700"
            />
          </div>
        </div>

        <div>
          <label className="block mb-1 text-sm">
            رسالة أسفل “يُرجى إحضار هذه الورقة عند الاستلام”
          </label>
          <textarea
            rows={4}
            value={receiptMessage}
            onChange={(e) => setReceiptMessage(e.target.value)}
            placeholder="مثال: في حال عدم الاستلام خلال 30 يومًا قد يتم تصفية الجهاز..."
            className="w-full px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={saveReceipt}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white"
          >
            حفظ إعدادات الإيصال
          </button>
        </div>

        {/* معاينة تقريبية */}
        <div className="mt-2">
          <div className="text-sm font-semibold mb-2">معاينة</div>
          <div
            className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
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
        </div>
      </section>

      {/* نسب الفنيين — شبكة جانبية لتوفير المساحة */}
      <section className="p-3 rounded-xl bg-white dark:bg-gray-800">
        <h2 className="font-semibold mb-2">نِسَب مخصصة لفنيين</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
          {techs.map((t) => (
            <TechCard
              key={t._id}
              tech={t}
              onSave={saveTechPct}
              saving={savingTech === t._id}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function TechCard({ tech, onSave, saving }) {
  const [pct, setPct] = useState(
    typeof tech.commissionPct === "number" ? tech.commissionPct : ""
  );
  return (
    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
      <div className="font-semibold">
        {tech.name} <span className="opacity-70">(@{tech.username})</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          min="0"
          max="100"
          placeholder="افتراضي"
          value={pct}
          onChange={(e) => setPct(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white dark:bg-gray-900 w-28"
        />
        <span>%</span>
        <button
          onClick={() => onSave(tech._id, pct === "" ? 50 : pct)}
          disabled={saving}
          className="px-3 py-2 rounded-xl bg-emerald-600 text-white disabled:opacity-50"
        >
          {saving ? "…" : "حفظ"}
        </button>
      </div>
    </div>
  );
}
