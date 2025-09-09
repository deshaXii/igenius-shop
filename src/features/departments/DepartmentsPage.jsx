import { useEffect, useMemo, useState } from "react";
import api, { DepartmentsAPI } from "../../lib/api";

// شارات عربية للأوضاع (عدّل القيم لتطابق حالتك الفعلية)
const STATUS_LABELS = {
  delivered: "تم التسليم",
  waiting: "في الانتظار",
  in_progress: "جاري العمل",
  on_hold: "معلّق",
  cancelled: "ملغي",
  unknown: "غير معروف",
};

export default function DepartmentsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", description: "" });
  const [editing, setEditing] = useState(null);

  // لكل قسم: فنيين، إحصاءات، قائمة صيانات
  const [open, setOpen] = useState({}); // { [depId]: true/false }
  const [techs, setTechs] = useState({}); // { [depId]: Technician[] }
  const [stats, setStats] = useState({}); // { [depId]: { byStatus, total } }
  const [repairs, setRepairs] = useState({}); // { [depId]: { list, statusFilter } }
  const [picker, setPicker] = useState({}); // { [depId]: { candidateTechId: "", unassigned: Technician[] } }

  async function loadDeps() {
    setLoading(true);
    const deps = await DepartmentsAPI.list();
    setItems(deps);
    setLoading(false);
  }

  useEffect(() => {
    loadDeps();
  }, []);

  // تحميل فنيين القسم + غير المعيّنين
  async function loadTechs(depId) {
    const [inDept, unassigned] = await Promise.all([
      api.get(`/departments/${depId}/technicians`).then((r) => r.data),
      api.get(`/technicians?department=null`).then((r) => r.data),
    ]);
    setTechs((prev) => ({ ...prev, [depId]: inDept }));
    setPicker((prev) => ({
      ...prev,
      [depId]: { candidateTechId: "", unassigned },
    }));
  }

  async function assignTech(depId, techId) {
    if (!techId) return;
    await api.put(`/technicians/${techId}/department`, { departmentId: depId });
    await loadTechs(depId);
    // لما فنّي يتعيّن، الإحصائيات قد تتغيّر لاحقًا، نحدّثها عند الحاجة
  }

  async function loadStats(depId) {
    const s = await api
      .get(`/departments/${depId}/repair-stats`)
      .then((r) => r.data);
    setStats((prev) => ({ ...prev, [depId]: s }));
  }

  async function loadRepairs(depId, statusFilter = "") {
    const qs = statusFilter
      ? `?status=${encodeURIComponent(statusFilter)}`
      : "";
    const list = await api
      .get(`/departments/${depId}/repairs${qs}`)
      .then((r) => r.data);
    setRepairs((prev) => ({ ...prev, [depId]: { list, statusFilter } }));
  }

  function toggle(depId) {
    const isOpen = !!open[depId];
    const next = { ...open, [depId]: !isOpen };
    setOpen(next);
    // أول مرة نفتحه: حمّل البيانات
    if (!isOpen) {
      loadTechs(depId);
      loadStats(depId);
      loadRepairs(depId, ""); // الكل
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (editing) {
      await DepartmentsAPI.update(editing._id, form);
    } else {
      await DepartmentsAPI.create(form);
    }
    setForm({ name: "", description: "" });
    setEditing(null);
    await loadDeps();
  }

  async function setMonitor(depId, userId) {
    await DepartmentsAPI.assignMonitor(depId, userId);
    await loadDeps();
    await loadTechs(depId);
  }

  async function remove(depId) {
    if (!confirm("حذف القسم؟ سيظل الفنيون بدون قسم.")) return;
    await DepartmentsAPI.remove(depId);
    await loadDeps();
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">الأقسام</h1>

      {/* فورم إنشاء/تعديل */}
      <form
        onSubmit={submit}
        className="grid gap-3 max-w-xl bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow"
      >
        <div>
          <label className="block mb-1 text-sm">اسم القسم</label>
          <input
            className="w-full border rounded-lg px-3 py-2"
            value={form.name}
            onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="block mb-1 text-sm">الوصف (اختياري)</label>
          <textarea
            className="w-full border rounded-lg px-3 py-2"
            rows={3}
            value={form.description}
            onChange={(e) =>
              setForm((v) => ({ ...v, description: e.target.value }))
            }
          />
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-lg bg-black text-white">
            {editing ? "تحديث" : "إضافة"}
          </button>
          {editing && (
            <button
              type="button"
              className="px-3 py-2 rounded-lg border"
              onClick={() => {
                setEditing(null);
                setForm({ name: "", description: "" });
              }}
            >
              إلغاء
            </button>
          )}
        </div>
      </form>

      {/* القائمة */}
      <div className="grid gap-3">
        {loading ? (
          <div>جار التحميل…</div>
        ) : items.length === 0 ? (
          <div className="opacity-70">لا توجد أقسام بعد.</div>
        ) : (
          items.map((d) => {
            const depOpen = !!open[d._id];
            const depTechs = techs[d._id] || [];
            const depPicker = picker[d._id] || {
              candidateTechId: "",
              unassigned: [],
            };
            const depStats = stats[d._id] || { byStatus: {}, total: 0 };
            const depRep = repairs[d._id] || { list: [], statusFilter: "" };

            return (
              <div
                key={d._id}
                className="p-4 rounded-2xl border bg-white dark:bg-zinc-900"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold">{d.name}</div>
                    {d.description && (
                      <div className="text-sm opacity-70">{d.description}</div>
                    )}
                    <div className="text-sm mt-1">
                      عدد الفنيين: <b>{d.techCount}</b>
                    </div>
                    <div className="text-sm mt-1">
                      المراقب:{" "}
                      <b>
                        {d.monitor
                          ? d.monitor.name ||
                            d.monitor.username ||
                            d.monitor.email
                          : "غير معيَّن"}
                      </b>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="px-3 py-2 rounded-lg border"
                      onClick={() => {
                        setEditing(d);
                        setForm({
                          name: d.name,
                          description: d.description || "",
                        });
                      }}
                    >
                      تعديل
                    </button>
                    <button
                      className="px-3 py-2 rounded-lg border"
                      onClick={() => remove(d._id)}
                    >
                      حذف
                    </button>
                    <button
                      className="px-3 py-2 rounded-lg border"
                      onClick={() => toggle(d._id)}
                    >
                      {depOpen ? "إخفاء التفاصيل" : "عرض التفاصيل"}
                    </button>
                  </div>
                </div>

                {/* تفاصيل القسم */}
                {depOpen && (
                  <div className="mt-4 grid gap-6">
                    {/* تعيين مراقب */}
                    <div>
                      <label className="block mb-1 text-sm">
                        تعيين مراقب للقسم
                      </label>
                      <div className="flex gap-2">
                        <select
                          className="border rounded-lg px-3 py-2"
                          defaultValue={d.monitor ? d.monitor._id : ""}
                          onChange={(e) =>
                            setMonitor(d._id, e.target.value || null)
                          }
                        >
                          <option value="">— بدون مراقب —</option>
                          {depTechs.map((u) => (
                            <option key={u._id} value={u._id}>
                              {u.name || u.username || u.email}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* الفنيون */}
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">الفنيون</h3>
                        <div className="flex items-center gap-2">
                          <select
                            className="border rounded-lg px-3 py-2"
                            value={depPicker.candidateTechId || ""}
                            onChange={(e) =>
                              setPicker((prev) => ({
                                ...prev,
                                [d._id]: {
                                  ...depPicker,
                                  candidateTechId: e.target.value,
                                },
                              }))
                            }
                          >
                            <option value="">— اختر فنّيًا غير معيَّن —</option>
                            {depPicker.unassigned.map((u) => (
                              <option key={u._id} value={u._id}>
                                {u.name || u.username || u.email}
                              </option>
                            ))}
                          </select>
                          <button
                            className="px-3 py-2 rounded-lg border"
                            onClick={() =>
                              assignTech(d._id, depPicker.candidateTechId)
                            }
                          >
                            إضافة للقسم
                          </button>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-[500px] w-full text-sm">
                          <thead>
                            <tr className="text-left border-b">
                              <th className="py-2 px-2">الاسم</th>
                              <th className="py-2 px-2">البريد</th>
                              <th className="py-2 px-2">الهاتف</th>
                            </tr>
                          </thead>
                          <tbody>
                            {depTechs.length === 0 ? (
                              <tr>
                                <td
                                  className="py-3 px-2 opacity-70"
                                  colSpan={3}
                                >
                                  لا يوجد فنيون في هذا القسم.
                                </td>
                              </tr>
                            ) : (
                              depTechs.map((t) => (
                                <tr key={t._id} className="border-b">
                                  <td className="py-2 px-2">
                                    {t.name || t.username || "-"}
                                  </td>
                                  <td className="py-2 px-2">
                                    {t.email || "-"}
                                  </td>
                                  <td className="py-2 px-2">
                                    {t.phone || "-"}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* إحصائيات الصيانة */}
                    <div className="grid gap-2">
                      <h3 className="font-semibold">الصيانة — إحصائيات</h3>
                      <div className="flex flex-wrap gap-2">
                        <StatChip
                          label={`الكل (${depStats.total || 0})`}
                          active={!depRep.statusFilter}
                          onClick={() => loadRepairs(d._id, "")}
                        />
                        {Object.entries(depStats.byStatus || {}).map(
                          ([status, count]) => (
                            <StatChip
                              key={status}
                              label={`${
                                STATUS_LABELS[status] || status
                              } (${count})`}
                              active={depRep.statusFilter === status}
                              onClick={() => loadRepairs(d._id, status)}
                            />
                          )
                        )}
                      </div>
                      {/* قائمة الصيانة */}
                      <div className="overflow-x-auto">
                        <table className="min-w-[600px] w-full text-sm">
                          <thead>
                            <tr className="text-left border-b">
                              <th className="py-2 px-2">الكود</th>
                              <th className="py-2 px-2">الحالة</th>
                              <th className="py-2 px-2">الجهاز/العميل</th>
                              <th className="py-2 px-2">الفني</th>
                              <th className="py-2 px-2">آخر تحديث</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(depRep.list || []).length === 0 ? (
                              <tr>
                                <td
                                  className="py-3 px-2 opacity-70"
                                  colSpan={5}
                                >
                                  لا توجد عناصر.
                                </td>
                              </tr>
                            ) : (
                              depRep.list.map((r) => (
                                <tr key={r._id} className="border-b">
                                  <td className="py-2 px-2">
                                    {r.code || r._id.slice(-6)}
                                  </td>
                                  <td className="py-2 px-2">
                                    {STATUS_LABELS[r.status] || r.status || "-"}
                                  </td>
                                  <td className="py-2 px-2">
                                    {r.device?.model || r.device || "-"} /{" "}
                                    {r.customer?.name || r.customer || "-"}
                                  </td>
                                  <td className="py-2 px-2">
                                    {r.technician
                                      ? r.technician.name ||
                                        r.technician.username ||
                                        r.technician.email
                                      : "-"}
                                  </td>
                                  <td className="py-2 px-2">
                                    {new Date(
                                      r.updatedAt || r.createdAt
                                    ).toLocaleString()}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function StatChip({ label, active, onClick }) {
  return (
    <button
      className={`px-3 py-1 rounded-full border ${
        active ? "bg-black text-white" : ""
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
