// src/features/backup/BackupPage.jsx
import { useEffect, useRef, useState } from "react";
import API from "../../lib/api";
import formatDate from "../../utils/formatDate";

export default function BackupPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState("");

  // Restore state
  const fileRef = useRef(null);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreReplace, setRestoreReplace] = useState(true);
  const [restoreMsg, setRestoreMsg] = useState("");
  const [restoreErr, setRestoreErr] = useState("");
  const [ensureSeedAdmin, setEnsureSeedAdmin] = useState(true);
  const [resetSeedPassword, setResetSeedPassword] = useState(false);

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

  async function backupAndDownload() {
    setRunning(true);
    try {
      const res = await API.post("/backup/run-download", null, {
        responseType: "blob",
      });
      const cd = res.headers?.["content-disposition"] || "";
      const m = cd.match(/filename="([^"]+)"/);
      const name = m ? m[1] : "backup.json.gz";
      downloadBlob(res.data, name);
      await load();
    } catch (e) {
      alert(e?.response?.data?.message || "فشل إنشاء/تنزيل النسخة الاحتياطية");
    } finally {
      setRunning(false);
    }
  }

  // ====== Size formatting (Bytes/KB/MB/GB) ======
  function formatBytes(bytes) {
    if (bytes == null) return "—";
    const n = Number(bytes);
    if (!Number.isFinite(n) || n < 0) return "—";

    const KB = 1024;
    const MB = KB * 1024;
    const GB = MB * 1024;

    if (n < KB) return `${n.toFixed(0)} ب`;
    if (n < MB) return `${(n / KB).toFixed(2)} ك.ب`;
    if (n < GB) return `${(n / MB).toFixed(2)} م.ب`;
    return `${(n / GB).toFixed(2)} ج.ب`;
  }

  function pickBytes(kind) {
    if (!data) return null;
    const map = {
      data: ["dataSizeBytes"],
      storage: ["storageSizeBytes"],
      index: ["indexSizeBytes"],
      total: ["totalSizeBytes"],
    };
    const keys = map[kind] || [];
    for (const k of keys) {
      if (data[k] != null) return data[k];
    }
    // fallback لو لسه بيرجع MB فقط
    const mbKey =
      kind === "data"
        ? "dataSizeMB"
        : kind === "storage"
        ? "storageSizeMB"
        : kind === "index"
        ? "indexSizeMB"
        : "totalSizeMB";
    if (data[mbKey] != null) return Number(data[mbKey]) * 1024 * 1024;
    return null;
  }

  async function restoreFromBackup() {
    setRestoreMsg("");
    setRestoreErr("");

    if (!restoreFile) {
      setRestoreErr("اختر ملف النسخة الاحتياطية أولاً.");
      return;
    }

    const dangerText = restoreReplace
      ? "تحذير: سيتم مسح البيانات الحالية ثم استرجاع البيانات من الملف. هل أنت متأكد؟"
      : "سيتم دمج البيانات (قد يحدث تعارض/تكرار). هل أنت متأكد؟";

    if (!confirm(dangerText)) return;

    setRunning(true);
    try {
      const fd = new FormData();
      fd.append("file", restoreFile);
      fd.append("replace", restoreReplace ? "1" : "0");
      fd.append("ensureSeedAdmin", ensureSeedAdmin ? "1" : "0");
      fd.append("resetSeedPassword", resetSeedPassword ? "1" : "0");

      const r = await API.post("/backup/restore", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      }).then((x) => x.data);

      const seedInfo = r?.seedAdmin?.ensured
        ? ` | SeedAdmin: ${r.seedAdmin.email} (${
            r.seedAdmin.created ? "created" : "updated"
          }${r.seedAdmin.resetPassword ? ", password reset" : ""})`
        : "";

      const totals = r?.totals
        ? `تمت الاستعادة. Collections: ${r.totals.collections} | Inserted: ${r.totals.inserted} | Deleted: ${r.totals.deleted}${seedInfo}`
        : `تمت الاستعادة بنجاح.${seedInfo}`;

      setRestoreMsg(totals);
      setRestoreFile(null);
      if (fileRef.current) fileRef.current.value = "";

      await load();
    } catch (e) {
      setRestoreErr(
        e?.response?.data?.message || "فشل استعادة النسخة الاحتياطية"
      );
    } finally {
      setRunning(false);
    }
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
              <Info
                label="حجم البيانات (data)"
                value={formatBytes(pickBytes("data"))}
              />
              <Info
                label="حجم التخزين (storage)"
                value={formatBytes(pickBytes("storage"))}
              />
              <Info
                label="حجم الفهارس (indexes)"
                value={formatBytes(pickBytes("index"))}
              />
              <Info
                label="إجمالي المساحة المستخدمة"
                value={formatBytes(pickBytes("total"))}
              />
              <Info
                label="النسبة من الباقة"
                value={
                  data.limitMB
                    ? `${Number(data.usagePercent || 0).toFixed(
                        2
                      )}% من ${formatBytes(Number(data.limitMB) * 1024 * 1024)}`
                    : `${Number(data.usagePercent || 0).toFixed(2)}%`
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

            {/* Restore UI */}
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 space-y-2">
              <div className="font-semibold">استعادة من ملف Backup</div>

              <div className="flex flex-wrap items-center gap-3 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={ensureSeedAdmin}
                    onChange={(e) => {
                      setEnsureSeedAdmin(e.target.checked);
                      if (!e.target.checked) setResetSeedPassword(false);
                    }}
                  />
                  إنشاء/تأكيد Admin الطوارئ بعد الاستعادة
                  (ADMIN_EMAIL/ADMIN_PASSWORD)
                </label>

                <label className="flex items-center gap-2 opacity-90">
                  <input
                    type="checkbox"
                    checked={resetSeedPassword}
                    onChange={(e) => setResetSeedPassword(e.target.checked)}
                    disabled={!ensureSeedAdmin}
                  />
                  إعادة ضبط كلمة مرور Admin الطوارئ بعد الاستعادة
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={restoreReplace}
                    onChange={(e) => setRestoreReplace(e.target.checked)}
                  />
                  مسح البيانات قبل الاسترجاع (Replace)
                </label>

                <input
                  ref={fileRef}
                  type="file"
                  accept=".gz,.json,.json.gz"
                  className="hidden"
                  onChange={(e) => {
                    setRestoreMsg("");
                    setRestoreErr("");
                    const f = e.target.files?.[0] || null;
                    setRestoreFile(f);
                  }}
                />

                <button
                  onClick={() => fileRef.current?.click()}
                  className="px-3 py-2 rounded-xl bg-gray-200 dark:bg-gray-700"
                  disabled={running}
                >
                  اختيار ملف
                </button>

                <div className="text-xs opacity-80">
                  {restoreFile ? (
                    <>
                      الملف: <b>{restoreFile.name}</b> (
                      {Math.round(restoreFile.size / 1024)} ك.ب)
                    </>
                  ) : (
                    "لم يتم اختيار ملف"
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={restoreFromBackup}
                  className="px-3 py-2 rounded-xl bg-emerald-600 text-white disabled:opacity-60"
                  disabled={running || !restoreFile}
                >
                  {running ? "جارٍ الاستعادة…" : "استعادة الآن"}
                </button>

                {restoreMsg && (
                  <div className="text-sm text-green-700">{restoreMsg}</div>
                )}
                {restoreErr && (
                  <div className="text-sm text-red-600">{restoreErr}</div>
                )}
              </div>

              <div className="text-xs opacity-70">
                ملاحظة: الاستعادة تدعم ملفات النسخ التي تم تنزيلها من زر "نسخ +
                تنزيل الآن".
              </div>
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

              {/* <button
                onClick={async () => {
                  if (!confirm("تحذير: سيتم مسح كل البيانات! هل أنت متأكد؟")) return;
                  try {
                    await API.delete("/backup/clear");
                    await load();
                  } catch (e) {
                    alert(e?.response?.data?.message || "فشل مسح البيانات");
                  }
                }}
                className="px-3 py-2 rounded-xl bg-red-600 text-white"
                disabled={running}
              >
                مسح الكل
              </button> */}
            </div>

            {data.latestFile && data.latestFileSizeMB != null && (
              <div className="text-sm text-[16px] opacity-80">
                (آخر ملف مسجّل: <b>{data.latestFile}</b> —{" "}
                {formatBytes(Number(data.latestFileSizeMB) * 1024 * 1024)})
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
