// src/features/backup/BackupPage.jsx
import { useEffect, useState } from "react";
import API from "../../lib/api";
import formatDate from "../../utils/formatDate";

export default function BackupPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState("");
  const [wa, setWa] = useState(() => localStorage.getItem("wa_number") || ""); // رقم واتساب

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const r = await API.get("/backup/stats").then((r) => r.data);
      setData(r);
    } catch (e) {
      setErr(e?.response?.data?.message || "تعذر تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }

  function saveWa(v) {
    setWa(v);
    try {
      localStorage.setItem("wa_number", v || "");
    } catch {}
  }

  // تنزيل ملف (blob) باسم معيّن
  function downloadBlob(blob, filename = "backup.json.gz") {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 0);
  }

  // ➊ نسخ + تنزيل الآن (بدون تخزين خارجي)
  async function backupAndDownload() {
    setRunning(true);
    try {
      const res = await API.post("/backup/run-download", null, {
        responseType: "blob",
      });
      // اسم الملف من الهيدر لو متاح
      const cd = res.headers?.["content-disposition"] || "";
      const m = cd.match(/filename="([^"]+)"/);
      const name = m ? m[1] : "backup.json.gz";
      downloadBlob(res.data, name);
      // حدّث الإحصائيات بعد النجاح
      load();
    } catch (e) {
      alert(e?.response?.data?.message || "فشل إنشاء/تنزيل النسخة الاحتياطية");
    } finally {
      setRunning(false);
    }
  }

  // ضيف الدالة دي فوق داخل نفس الملف
  function normalizePhone(raw) {
    let p = String(raw || "").trim();
    p = p.replace(/\D/g, ""); // امسح أي رموز غير أرقام
    if (p.startsWith("00")) p = p.slice(2);
    // تصحيح شائع: 20 + 0xxxx -> 20 + xxxx
    if (p.startsWith("20") && p.length >= 12 && p[2] === "0") {
      p = "20" + p.slice(3);
    }
    return p;
  }

  function openWhatsAppLink(phone, text) {
    const link = phone
      ? `https://wa.me/${encodeURIComponent(phone)}?text=${encodeURIComponent(
          text
        )}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    // افتح في تبويب جديد بطريقة تقلل حجب البوب-أب
    const a = document.createElement("a");
    a.href = link;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 0);
  }

  // استبدل دالة backupAndWhatsapp بالكامل بهذه:
  async function backupAndWhatsapp() {
    setRunning(true);
    try {
      const res = await API.post("/backup/run-download", null, {
        responseType: "blob",
      });
      const cd = res.headers?.["content-disposition"] || "";
      const m = cd.match(/filename="([^"]+)"/);
      const name = m ? m[1] : "backup.json.gz";
      const blob = res.data;

      // جرّب Web Share لو مدعوم وبملف صغير نسبيًا
      let shared = false;
      const phone = normalizePhone(wa);
      const shareText = `تم إنشاء نسخة احتياطية بإسم ${name}. إذا لم يُرفق الملف تلقائيًا، ستجده محمّلًا على جهازك.`;

      try {
        const file = new File([blob], name, {
          type: "application/octet-stream",
        }); // نوع عام لزيادة التوافق
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: "نسخة احتياطية",
            text: shareText,
            files: [file],
          });
          shared = true;
        }
      } catch (e) {
        // لو المشاركة فشلت لأي سبب، هنكمل بالفولباك
        console.debug("Web Share failed, falling back to download + wa.me:", e);
      }

      if (!shared) {
        // فولباك مضمون: نزّل الملف وافتح واتساب برسالة جاهزة
        downloadBlob(blob, name);
        openWhatsAppLink(phone, shareText);
      }

      load();
    } catch (e) {
      // هنا بس لو حصل فشل في طلب /run-download نفسه
      alert(
        e?.response?.data?.message || "فشل في إنشاء/تنزيل النسخة الاحتياطية"
      );
    } finally {
      setRunning(false);
    }
  }

  function mb(n) {
    if (n == null) return "—";
    const num = Number(n);
    if (!Number.isFinite(num)) return String(n);
    return `${num.toFixed(2)} م.ب`;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">النسخ الاحتياطي / إدارة البيانات</h1>

      <section className="p-3 rounded-xl bg-white dark:bg-gray-800 space-y-3">
        {loading ? (
          <div>جارِ التحميل...</div>
        ) : err ? (
          <div className="text-red-600">{err}</div>
        ) : !data ? (
          <div>لا يوجد بيانات.</div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-2">
              <Info label="حجم البيانات (data)" value={mb(data.dataSizeMB)} />
              <Info
                label="حجم التخزين (storage)"
                value={mb(data.storageSizeMB)}
              />
              <Info
                label="حجم الفهارس (indexes)"
                value={mb(data.indexSizeMB)}
              />
              <Info
                label="إجمالي المساحة المستخدمة"
                value={mb(data.totalSizeMB)}
              />
              <Info
                label="النسبة من الباقة"
                value={
                  data.limitMB
                    ? `${Number(data.usagePercent || 0).toFixed(1)}% من ${mb(
                        data.limitMB
                      )}`
                    : `${Number(data.usagePercent || 0).toFixed(1)}%`
                }
              />
            </div>

            <div>
              آخر نسخة احتياطية:{" "}
              <b>
                {data.lastBackupAt
                  ? formatDate(data.lastBackupAt)
                  : "— لم تُؤخذ نسخة بعد"}
              </b>
            </div>

            {/* إعداد رقم واتساب */}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <label className="opacity-70">رقم واتساب (دولي بدون +):</label>
              <input
                value={wa}
                onChange={(e) => saveWa(e.target.value)}
                placeholder="مثال: 201234567890"
                className="px-2 py-1 rounded-lg border dark:bg-gray-900"
                style={{ direction: "ltr" }}
              />
            </div>

            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={load}
                className="px-3 py-2 rounded-xl bg-gray-200 dark:bg-gray-700"
                disabled={loading || running}
              >
                تحديث
              </button>

              <button
                onClick={backupAndDownload}
                className="px-3 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-60"
                disabled={running}
              >
                {running ? "جارٍ التحضير…" : "نسخ + تنزيل الآن"}
              </button>

              <button
                onClick={backupAndWhatsapp}
                className="px-3 py-2 rounded-xl bg-green-600 text-white disabled:opacity-60"
                disabled={running}
              >
                {running ? "جارٍ المشاركة…" : "نسخ + واتساب"}
              </button>

              {/* زر مسح كل البيانات (اختياري كما كان) */}
              <button
                onClick={async () => {
                  if (!confirm("تحذير: سيتم مسح كل البيانات! هل أنت متأكد؟"))
                    return;
                  await API.delete("/backup/clear");
                  await load();
                }}
                className="px-3 py-2 rounded-xl bg-red-600 text-white"
              >
                مسح الكل
              </button>
            </div>

            {data.latestFile && data.latestFileSizeMB != null && (
              <div className="text-sm text-[16px] opacity-80">
                (آخر ملف مسجّل: <b>{data.latestFile}</b> —{" "}
                {mb(data.latestFileSizeMB)})
              </div>
            )}

            {data.warning && (
              <div className="text-amber-600">
                تحذير: اقتربت من الحد المجاني
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="p-2 rounded-xl bg-gray-50 dark:bg-gray-700/40">
      <div className="text-[11px] opacity-70">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
