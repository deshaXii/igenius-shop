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

export default function PublicTrackingPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try {
      // ✅ استخدم API client عشان نفس إعدادات الـ /api زي المشروع كله
      const { data } = await API.get(`/public/repairs/${token}`);
      setData(data);
    } catch (e) {
      setErr("تعذر تحميل بيانات التتبّع");
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [token]);

  if (err) return <div className="p-4 text-center text-red-600">{err}</div>;
  if (!data) return <div className="p-4 text-center">جارِ التحميل…</div>;

  const r = data.repair || {};
  const shop = data.shop || {};
  const color = STATUS_COLOR[r.status] || "bg-gray-100 text-gray-800";

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <header className="flex items-center justify-between">
        <div className="text-lg font-bold">{shop.name || "تتبّع الصيانة"}</div>
        {shop.whatsapp && (
          <a
            className="underline"
            href={`https://wa.me/${shop.whatsapp}`}
            target="_blank"
            rel="noreferrer"
          >
            واتساب
          </a>
        )}
      </header>

      <section className="p-4 rounded-2xl bg-white dark:bg-gray-800 shadow">
        <div className="text-sm opacity-70">صيانة #{r.repairId}</div>
        <div className="text-xl font-bold">{r.deviceType || "—"}</div>
        <div
          className={`inline-block mt-2 px-2 py-1 rounded-full text-xs ${color}`}
        >
          {r.status}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
          <Info label="تم الاستلام">{fmt(r.createdAt)}</Info>
          <Info label="بدأ العمل">{fmt(r.startTime)}</Info>
          <Info label="اكتملت">{fmt(r.endTime)}</Info>
          <Info label="تم التسليم">{fmt(r.deliveryDate)}</Info>
          <Info label="موعد متوقع">{fmt(r.eta)}</Info>
          <Info label="السعر النهائي">
            {r.finalPrice != null ? r.finalPrice : "—"}
          </Info>
        </div>

        {r.notesPublic && (
          <div className="mt-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 text-sm">
            <div className="text-xs opacity-70">ملاحظة</div>
            <div className="font-medium">{r.notesPublic}</div>
          </div>
        )}
      </section>

      {shop.address && (
        <section className="p-4 rounded-2xl bg-white dark:bg-gray-800 shadow text-sm">
          <div className="font-semibold mb-1">عنوان المحل</div>
          <div>{shop.address}</div>
          {shop.workingHours && (
            <div className="opacity-70 mt-1">{shop.workingHours}</div>
          )}
          {shop.phone && (
            <a
              className="inline-block mt-2 underline"
              href={`tel:${shop.phone}`}
            >
              اتصال
            </a>
          )}
        </section>
      )}

       {/* Updates timeline */}
       {data?.repair?.updates?.length > 0 && (
        <section className="mt-4 p-3 rounded-2xl border">
          <div className="font-semibold mb-2">تحديثات من الفني</div>
          <div className="grid gap-3">
            {data.repair.updates.map((u, idx)=>(
              <div key={idx} className="p-2 rounded-xl bg-gray-50 dark:bg-gray-700/40">
                <div className="text-xs opacity-70">{fmt(u.createdAt)}</div>
                {u.type === 'text' && <div className="font-medium whitespace-pre-wrap">{u.text}</div>}
                {u.type === 'image' && <img alt="" src={u.fileUrl} className="max-h-64 rounded-xl" />}
                {u.type === 'video' && <video controls src={u.fileUrl} className="rounded-xl" />}
                {u.type === 'audio' && <audio controls src={u.fileUrl} />}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Info({ label, children }) {
  return (
    <div className="p-2 rounded-xl bg-gray-50 dark:bg-gray-700/40">
      <div className="text-[11px] opacity-70">{label}</div>
      <div className="font-medium break-words">{children}</div>
    </div>
  );
}
