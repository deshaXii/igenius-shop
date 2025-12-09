// src/features/technicians/TechnicianProfilePage.jsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import API from "../../lib/api";
import formatDate from "../../utils/formatDate"; // ← import صحيح (Default)

import useAuthStore from "../auth/authStore";

export default function TechnicianProfilePage() {
  const { id } = useParams(); // لو داخل من /technicians/:id/profile
  const { user } = useAuthStore(); // هيفيدنا لو داخل من /profile
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [view, setView] = useState({
    tech: null,
    counts: {
      total: 0,
      open: 0,
      completed: 0,
      delivered: 0,
      returned: 0,
      rejected: 0,
    },
    totals: { profit: 0, techShare: 0, shopShare: 0, partsCost: 0 },
    currentAssignments: [],
  });

  async function load() {
    setLoading(true);
    setErr("");

    try {
      // حدّد الـ endpoint حسب وجود id في المسار
      const isSelf = !id;
      const endpoint = isSelf ? "/profile" : `/technicians/${id}/profile`;
      const res = await API.get(endpoint).then((r) => r.data);

      // تطبيع الاستجابة: ندعم /profile و /technicians/:id/profile
      const tech = res.tech || res.user || {};
      const repairsCount = res.repairsCount ?? res.counts?.total ?? 0;
      const summary = res.summary || res.totals || {};

      let counts = res.counts || { total: repairsCount };
      const totals = {
        profit: Number(summary.profit || 0),
        techShare: Number(summary.techShare || 0),
        shopShare: Number(summary.shopShare || 0),
        partsCost: Number(summary.partsCost || 0),
      };

      // تحميل التكليفات الجارية + حساب الإحصائيات التفصيلية لو counts مش راجع
      let currentAssignments = [];
      try {
        const techId = id || tech._id || user?.id || user?._id;
        if (!techId && isSelf) {
          // لو داخل على /profile ومفيش user في الحالة، ارجعه لتسجيل الدخول
          throw new Error("no-user");
        }

        if (techId) {
          // نجيب كل صيانات الفني (بدون فلترة وقتية) ونبني الإحصائيات
          const reps = await API.get("/repairs", {
            params: { technician: techId },
          }).then((r) => r.data || []);

          const OPEN = new Set(["في الانتظار", "جاري العمل"]);
          const deliveredCount = reps.filter(
            (r) => r.status === "تم التسليم"
          ).length;
          const returnedCount = reps.filter((r) => r.status === "مرتجع").length;
          const rejectedCount = reps.filter((r) => r.status === "مرفوض").length;
          const completedCount = reps.filter(
            (r) => r.status === "مكتمل"
          ).length;
          const openCount = reps.filter((r) => OPEN.has(r.status)).length;

          if (!res.counts) {
            counts = {
              total: reps.length,
              open: openCount,
              completed: completedCount,
              delivered: deliveredCount,
              returned: returnedCount,
              rejected: rejectedCount,
            };
          }

          currentAssignments = reps
            .filter((r) => OPEN.has(r.status) || r.status === "مكتمل")
            .map((r) => ({
              id: r._id,
              repairId: r.repairId,
              customerName: r.customerName,
              status: r.status,
              createdAt: r.createdAt,
            }));
        }
      } catch (e) {
        // تجاهل أخطاء سحب الصيانات، بس خزّن التوتال المتاح
        if (e?.message === "no-user") {
          setErr("يرجى تسجيل الدخول لعرض الملف الشخصي");
        }
      }

      setView({
        tech: {
          _id: tech._id,
          name: tech.name || tech.username || "—",
          commissionPct:
            typeof tech.commissionPct === "number" ? tech.commissionPct : 50,
          permissions: tech.permissions || tech.perms || {},
        },
        counts,
        totals,
        currentAssignments,
      });
    } catch (e) {
      setErr(e?.response?.data?.message || "تعذر تحميل بروفايل الفني");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <div className="p-3">جارِ التحميل…</div>;
  if (err)
    return (
      <div className="p-3 rounded-xl bg-red-50 text-red-800">
        {err}
        <div className="mt-2">
          <button
            onClick={() => (id ? load() : navigate("/login"))}
            className="px-3 py-2 rounded-xl bg-gray-200 dark:bg-gray-700"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );

  const { tech, counts, totals, currentAssignments } = view;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">بروفايل: {tech.name}</h1>
        <Link
          to="/technicians"
          className="px-3 py-2 rounded-xl bg-gray-200 dark:bg-gray-700"
        >
          رجوع
        </Link>
      </header>

      {/* معلومات أساسية */}
      <section className="grid md:grid-cols-3 gap-4">
        <Card title="العمولة %" value={`${tech.commissionPct}%`} />
        <Card title="إجمالي الصيانات" value={counts?.total ?? 0} />
        <Card
          title="إجمالي قطع الغيار"
          value={Math.round(totals.partsCost || 0)}
        />
      </section>

      {/* حالة الصيانات (لو متاحة) */}
      <section className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card title="جاري/مفتوح" value={counts?.open ?? "—"} />
        <Card title="مكتمل" value={counts?.completed ?? "—"} />
        <Card title="تم التسليم" value={counts?.delivered ?? "—"} />
        <Card title="مرتجع" value={counts?.returned ?? "—"} />
        <Card title="مرفوض" value={counts?.rejected ?? "—"} />
      </section>

      {/* أرباح */}
      <section className="grid md:grid-cols-3 gap-4">
        <Card title="إجمالي الربح" value={Math.round(totals.profit || 0)} />
        <Card title="نصيب الفني" value={Math.round(totals.techShare || 0)} />
        <Card title="نصيب المحل" value={Math.round(totals.shopShare || 0)} />
      </section>

      {/* التكليفات الجارية */}
      <section className="p-3 rounded-xl bg-white dark:bg-gray-800">
        <h2 className="font-semibold mb-2">تكليفات جارية</h2>
        {currentAssignments.length === 0 ? (
          <div className="opacity-70">لا يوجد</div>
        ) : (
          <ul className="list-disc pr-5 space-y-1">
            {currentAssignments.map((r) => (
              <li key={r.id}>
                <Link className="underline" to={`/repairs/${r.id}`}>
                  #{r.repairId}
                </Link>
                {" — "}الحالة: {r.status} — {r.customerName} —{" "}
                {formatDate(r.createdAt)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="p-3 rounded-xl bg-white dark:bg-gray-800 text-center">
      <div className="text-sm text-[16px] opacity-70">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
