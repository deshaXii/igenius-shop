// src/features/departments/DepartmentsPage.jsx
import { useEffect, useMemo, useState } from "react";
import api, { DepartmentsAPI } from "../../lib/api";
import useAuthStore from "../auth/authStore";

/* ================== الإعدادات المرئية ================== */
const PALETTE = {
  primary: "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 text-white",
  outline:
    "border border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800",
  card: "bg-white/80 dark:bg-gray-900/80 backdrop-blur border border-slate-200 dark:border-slate-800",
  chip: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
};

const STATUS_LABELS = {
  delivered: "تم التسليم",
  waiting: "في الانتظار",
  in_progress: "جاري العمل",
  on_hold: "معلّق",
  cancelled: "ملغي",
  unknown: "غير معروف",
};
const STATUS_CLASS = {
  delivered:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
  waiting:
    "bg-slate-100 text-slate-800 dark:bg-slate-800/60 dark:text-slate-200",
  in_progress:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  on_hold:
    "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-200",
  cancelled: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200",
  unknown: "bg-gray-100 text-gray-800 dark:bg-gray-800/60 dark:text-gray-200",
};

/* ====== تطبيع صلاحيات اليوزر (يوحّد الاستلام/الإضافة) ====== */
const PERM_KEYS = [
  "accessAccounts",
  "addRepair",
  "editRepair",
  "deleteRepair",
  "receiveDevice",
  "settings",
  "adminOverride",
];
const toBool = (v) =>
  v === true ||
  v === 1 ||
  v === "1" ||
  v === "true" ||
  v === "on" ||
  v === "yes";
function normalizePerms(src) {
  const raw = src || {};
  const out = {};
  for (const k of PERM_KEYS) out[k] = toBool(raw[k] ?? false);
  if (out.addRepair || out.receiveDevice) {
    out.addRepair = true;
    out.receiveDevice = true;
  }
  if (out.adminOverride) {
    for (const k of PERM_KEYS) out[k] = true;
  }
  return out;
}

/* ================== الصفحة ================== */
export default function DepartmentsPage() {
  const { user } = useAuthStore();
  const perms = normalizePerms(user?.permissions || user?.perms || {});
  const isAdmin =
    user?.role === "admin" || perms.adminOverride === true || user?.isAdmin;
  const hasIntake = perms.addRepair || perms.receiveDevice;

  const [items, setItems] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");

  const [open, setOpen] = useState(() => {
    try {
      const raw = localStorage.getItem("depOpen.v2");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [tab, setTab] = useState({});

  const [techs, setTechs] = useState({});
  const [stats, setStats] = useState({});
  const [repairs, setRepairs] = useState({});

  const [picker, setPicker] = useState({});

  const [unassignedTechs, setUnassignedTechs] = useState([]);
  const [unassignedLoading, setUnassignedLoading] = useState(false);
  const [unassignedError, setUnassignedError] = useState("");

  const [secLoading, setSecLoading] = useState({});
  const [secError, setSecError] = useState({});

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [formBusy, setFormBusy] = useState(false);

  /* -------- Helpers -------- */
  function isMonitor(dep) {
    const monitorId = dep?.monitor?._id || dep?.monitor;
    const myId = user?._id || user?.id;
    return !!(monitorId && myId && String(monitorId) === String(myId));
  }
  function canAssignTech(dep) {
    return isAdmin || isMonitor(dep);
  }

  async function loadDeps() {
    setPageLoading(true);
    setPageError("");
    try {
      const deps = await DepartmentsAPI.list();
      setItems(Array.isArray(deps) ? deps : []);
    } catch (e) {
      setPageError(e?.response?.data?.message || "تعذر تحميل الأقسام");
    } finally {
      setPageLoading(false);
    }
  }

  async function loadUnassigned() {
    if (!(isAdmin || hasIntake)) return;
    setUnassignedLoading(true);
    setUnassignedError("");
    try {
      const list = await api
        .get("/technicians?department=null")
        .then((r) => r.data);
      setUnassignedTechs(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error("Failed to load unassigned technicians", e);
      setUnassignedTechs([]);
      setUnassignedError(
        e?.response?.data?.message || "تعذر تحميل الفنيين المتاحين"
      );
    } finally {
      setUnassignedLoading(false);
    }
  }

  useEffect(() => {
    loadDeps();
    loadUnassigned();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔹 هنا الإصلاح المهم: تحميل تفاصيل الأقسام المفتوحة بعد ما الأقسام تتحمل
  useEffect(() => {
    if (!items.length) return;
    items.forEach((d) => {
      if (open[d._id]) {
        if (!techs[d._id]) loadTechs(d._id);
        if (!stats[d._id]) loadStats(d._id);
        if (!repairs[d._id]) loadRepairs(d._id, "");
        if (!tab[d._id]) {
          setTab((t) => ({ ...t, [d._id]: "techs" }));
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, open]);

  function setLoading(depId, key, val) {
    setSecLoading((p) => ({
      ...p,
      [depId]: { ...(p[depId] || {}), [key]: val },
    }));
  }
  function setError(depId, msg = "") {
    setSecError((p) => ({ ...p, [depId]: msg }));
  }

  async function loadTechs(depId) {
    const dep = items.find((d) => d._id === depId);
    const allowAssign = canAssignTech(dep);

    setLoading(depId, "techs", true);
    setError(depId, "");
    try {
      const inDept = await api
        .get(`/departments/${depId}/technicians`)
        .then((r) => r.data);
      setTechs((prev) => ({ ...prev, [depId]: inDept }));
      if (allowAssign) {
        await loadUnassigned();
      }
    } catch (e) {
      setError(depId, e?.response?.data?.message || "تعذر تحميل الفنيين");
    } finally {
      setLoading(depId, "techs", false);
    }
  }

  async function assignTech(depId, techId) {
    if (!techId) return;
    setLoading(depId, "techs", true);
    try {
      await api.put(`/technicians/${techId}/department`, {
        departmentId: depId,
      });
      await loadTechs(depId);
      await loadUnassigned();
      setPicker((prev) => ({
        ...prev,
        [depId]: { candidateTechId: "" },
      }));
    } catch (e) {
      alert(e?.response?.data?.message || "تعذر تعيين الفنّي");
    } finally {
      setLoading(depId, "techs", false);
    }
  }

  async function unassignTech(depId, techId) {
    if (!techId) return;
    if (
      !window.confirm(
        "إزالة هذا الفني من القسم؟ سيظل الفني موجودًا ولكن بدون قسم."
      )
    ) {
      return;
    }
    setLoading(depId, "techs", true);
    try {
      await DepartmentsAPI.unassignTech(depId, techId);
      await loadTechs(depId);
      await loadUnassigned();
      setPicker((prev) => ({
        ...prev,
        [depId]: { candidateTechId: "" },
      }));
      await loadDeps();
    } catch (e) {
      alert(e?.response?.data?.message || "تعذر إزالة الفنّي من القسم");
    } finally {
      setLoading(depId, "techs", false);
    }
  }

  async function loadStats(depId) {
    setLoading(depId, "stats", true);
    setError(depId, "");
    try {
      const s = await api
        .get(`/departments/${depId}/repair-stats`)
        .then((r) => r.data);
      setStats((prev) => ({
        ...prev,
        [depId]: s || { byStatus: {}, total: 0 },
      }));
    } catch (e) {
      setError(depId, e?.response?.data?.message || "تعذر تحميل الإحصاءات");
    } finally {
      setLoading(depId, "stats", false);
    }
  }

  async function loadRepairs(depId, statusFilter = "") {
    setLoading(depId, "repairs", true);
    setError(depId, "");
    try {
      const qs = statusFilter
        ? `?status=${encodeURIComponent(statusFilter)}`
        : "";
      const list = await api
        .get(`/departments/${depId}/repairs${qs}`)
        .then((r) => r.data);
      setRepairs((prev) => ({ ...prev, [depId]: { list, statusFilter } }));
    } catch (e) {
      setError(depId, e?.response?.data?.message || "تعذر تحميل الصيانة");
    } finally {
      setLoading(depId, "repairs", false);
    }
  }

  function toggle(depId) {
    const isOpen = !!open[depId];
    const next = { ...open, [depId]: !isOpen };
    setOpen(next);
    try {
      localStorage.setItem("depOpen.v2", JSON.stringify(next));
    } catch {}
    if (!isOpen) {
      if (!techs[depId]) loadTechs(depId);
      if (!stats[depId]) loadStats(depId);
      if (!repairs[depId]) loadRepairs(depId, "");
      if (!tab[depId]) setTab((t) => ({ ...t, [depId]: "techs" }));
    }
  }

  async function setMonitor(depId, userId) {
    if (!isAdmin) {
      alert("تعيين المراقب متاح للأدمن فقط");
      return;
    }
    try {
      await DepartmentsAPI.assignMonitor(depId, userId || null);
      await loadDeps();
      await loadTechs(depId);
    } catch (e) {
      alert(e?.response?.data?.message || "تعذر تعيين المراقب");
    }
  }

  async function remove(depId) {
    if (!isAdmin) {
      alert("حذف الأقسام متاح للأدمن فقط");
      return;
    }
    if (!window.confirm("حذف القسم؟ سيظل الفنيون بدون قسم.")) return;
    try {
      await DepartmentsAPI.remove(depId);
      await loadDeps();
      await loadUnassigned();
    } catch (e) {
      alert(e?.response?.data?.message || "تعذر حذف القسم");
    }
  }

  function openCreate() {
    if (!isAdmin) return;
    setEditing(null);
    setForm({ name: "", description: "" });
    setModalOpen(true);
  }
  function openEdit(dep) {
    if (!isAdmin) return;
    setEditing(dep);
    setForm({ name: dep.name || "", description: dep.description || "" });
    setModalOpen(true);
  }
  async function submit(e) {
    e.preventDefault();
    if (!isAdmin) return;
    if (!form.name?.trim()) return;
    setFormBusy(true);
    try {
      if (editing) {
        await DepartmentsAPI.update(editing._id, {
          name: form.name.trim(),
          description: form.description || "",
        });
      } else {
        await DepartmentsAPI.create({
          name: form.name.trim(),
          description: form.description || "",
        });
      }
      await loadDeps();
      setModalOpen(false);
      setEditing(null);
      setForm({ name: "", description: "" });
    } catch (e2) {
      alert(e2?.response?.data?.message || "تعذر الحفظ");
    } finally {
      setFormBusy(false);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim();
    let arr = items.slice();
    if (q) {
      const lower = q.toLowerCase();
      arr = arr.filter(
        (d) =>
          (d.name || "").toLowerCase().includes(lower) ||
          (d.description || "").toLowerCase().includes(lower)
      );
    }
    if (sortBy === "techCount") {
      arr.sort((a, b) => (b.techCount || 0) - (a.techCount || 0));
    } else {
      arr.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }
    return arr;
  }, [items, query, sortBy]);

  function toggleAll(openState) {
    const map = {};
    filtered.forEach((d) => (map[d._id] = openState));
    setOpen(map);
    try {
      localStorage.setItem("depOpen.v2", JSON.stringify(map));
    } catch {}
    if (openState) {
      filtered.forEach((d) => {
        if (!techs[d._id]) loadTechs(d._id);
        if (!stats[d._id]) loadStats(d._id);
        if (!repairs[d._id]) loadRepairs(d._id, "");
        if (!tab[d._id]) setTab((t) => ({ ...t, [d._id]: "techs" }));
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* ===== هيدر منساب (Dashboard) ===== */}
      <div className="rounded-3xl overflow-hidden">
        <div className="bg-gradient-to-l from-fuchsia-600 via-violet-600 to-indigo-700 text-white p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">إدارة الأقسام</h1>
              <p className="opacity-90 mt-1">
                تنظيم الفنيين ومتابعة الصيانة عبر واجهة حديثة وسريعة.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => toggleAll(true)}
                className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25"
              >
                فتح الكل
              </button>
              <button
                onClick={() => toggleAll(false)}
                className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25"
              >
                طيّ الكل
              </button>
              {isAdmin && (
                <button
                  onClick={openCreate}
                  className="px-4 py-2 rounded-xl bg-white text-indigo-700 hover:opacity-90"
                >
                  + إضافة قسم
                </button>
              )}
            </div>
          </div>

          {/* شريط أدوات: بحث وفرز */}
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="col-span-2">
              <input
                className="w-full px-3 py-2 rounded-xl bg-white/15 placeholder-white/70 text-white outline-none"
                placeholder="ابحث باسم القسم أو الوصف…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div>
              <select
                className="w-full px-3 py-2 rounded-xl bg-white/15 text-white"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="name">ترتيب أبجدي</option>
                <option value="techCount">الأكثر فنيين</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* أخطاء/تحميل */}
      {pageError && (
        <div className="p-3 rounded-xl bg-rose-50 text-rose-800">
          {pageError}
        </div>
      )}
      {unassignedError && (
        <div className="p-3 rounded-xl bg-amber-50 text-amber-800 text-sm">
          {unassignedError}
        </div>
      )}

      {/* ===== قائمة الأقسام ===== */}
      <div className="grid gap-4">
        {pageLoading ? (
          <DeptSkeleton />
        ) : filtered.length === 0 ? (
          <div className={`p-6 rounded-2xl ${PALETTE.card} text-center`}>
            لا توجد نتائج مطابقة.
          </div>
        ) : (
          filtered.map((d) => {
            const depOpen = !!open[d._id];
            const depTechs = techs[d._id] || [];
            const depStats = stats[d._id] || { byStatus: {}, total: 0 };
            const depRep = repairs[d._id] || { list: [], statusFilter: "" };
            const depTab = tab[d._id] || "techs";
            const err = secError[d._id];
            const allowAssign = canAssignTech(d);
            const depLoading = secLoading[d._id] || {};
            const monitorId = d?.monitor?._id || d?.monitor;
            const depPicker = picker[d._id] || { candidateTechId: "" };

            return (
              <div
                key={d._id}
                className={`p-4 md:p-5 rounded-2xl ${PALETTE.card}`}
              >
                {/* رأس البطاقة */}
                <div className="flex items-start md:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg md:text-xl font-semibold truncate">
                        {d.name}
                      </h2>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${PALETTE.chip}`}
                      >
                        {d.techCount ?? 0} فنّي
                      </span>
                    </div>
                    {d.description && (
                      <div className="text-sm text-[16px] opacity-70 truncate mt-0.5">
                        {d.description}
                      </div>
                    )}
                    <div className="text-xs md:text-sm text-[16px] mt-1 flex flex-wrap items-center gap-1">
                      <span>المراقب:</span>
                      <b>
                        {d.monitor
                          ? d.monitor.name ||
                            d.monitor.username ||
                            d.monitor.email
                          : "غير معيَّن"}
                      </b>
                    </div>
                  </div>

                  <div className="flex-shrink-0 flex flex-wrap gap-2">
                    {isAdmin && (
                      <>
                        <button
                          className={`px-3 py-2 rounded-xl ${PALETTE.outline}`}
                          onClick={() => openEdit(d)}
                        >
                          تعديل
                        </button>
                        <button
                          className={`px-3 py-2 rounded-xl ${PALETTE.outline}`}
                          onClick={() => remove(d._id)}
                        >
                          حذف
                        </button>
                      </>
                    )}
                    <button
                      className={`px-3 py-2 rounded-xl ${PALETTE.outline}`}
                      onClick={() => toggle(d._id)}
                    >
                      {depOpen ? "إخفاء" : "عرض"}
                    </button>
                  </div>
                </div>

                {/* تفاصيل */}
                {depOpen && (
                  <div className="mt-4 grid gap-5">
                    {err && (
                      <div className="p-2 rounded-lg bg-rose-50 text-rose-800 text-sm">
                        {err}
                      </div>
                    )}

                    {/* اختيار مراقب (أدمن فقط) */}
                    <section className="grid sm:grid-cols-[1fr_auto] gap-3 items-center">
                      <div className="text-sm">
                        <div className="font-semibold mb-1">المراقب</div>
                        <div className="opacity-70">
                          اختر أحد فنيي القسم كمراقب مسؤول.
                        </div>
                      </div>
                      {isAdmin ? (
                        <select
                          className="border rounded-xl px-3 py-2 w-full sm:w-72"
                          defaultValue={d.monitor ? d.monitor._id : ""}
                          onChange={(e) =>
                            setMonitor(d._id, e.target.value || null)
                          }
                          disabled={!!depLoading.techs}
                        >
                          <option value="">— بدون مراقب —</option>
                          {depTechs.map((u) => (
                            <option key={u._id} value={u._id}>
                              {u.name || u.username || u.email}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-sm text-[16px] opacity-70">
                          {d.monitor
                            ? d.monitor.name ||
                              d.monitor.username ||
                              d.monitor.email
                            : "—"}
                        </div>
                      )}
                    </section>

                    {/* تبويبات التفاصيل */}
                    <Tabs
                      value={depTab}
                      onChange={(v) => setTab((t) => ({ ...t, [d._id]: v }))}
                      items={[
                        { id: "techs", label: "الفنيون" },
                        { id: "repairs", label: "الصيانة" },
                      ]}
                    />

                    {/* المحتوى داخل التبويب */}
                    {depTab === "techs" ? (
                      <section className="grid gap-4">
                        {/* إضافة فنّي (أدمن أو مراقب القسم فقط) */}
                        {allowAssign && (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <div className="flex-1">
                              <select
                                className="border rounded-xl px-3 py-2 w-full sm:w-72"
                                value={depPicker.candidateTechId || ""}
                                onChange={(e) =>
                                  setPicker((prev) => ({
                                    ...prev,
                                    [d._id]: {
                                      candidateTechId: e.target.value,
                                    },
                                  }))
                                }
                                disabled={
                                  !!depLoading.techs || unassignedLoading
                                }
                              >
                                <option value="">
                                  — اختر فنّيًا غير معيَّن —
                                </option>
                                {(unassignedTechs || []).map((u) => (
                                  <option key={u._id} value={u._id}>
                                    {u.name || u.username || u.email}
                                  </option>
                                ))}
                              </select>
                              {!depLoading.techs &&
                                !unassignedLoading &&
                                (unassignedTechs || []).length === 0 && (
                                  <p className="text-[11px] text-amber-600 mt-1">
                                    لا يوجد فنيون متاحون حاليًا بدون قسم. يمكنك
                                    إزالة فنّي من قسم آخر ليظهر هنا.
                                  </p>
                                )}
                            </div>
                            <button
                              className={`px-4 py-2 rounded-xl ${PALETTE.primary} disabled:opacity-50`}
                              onClick={() =>
                                assignTech(d._id, depPicker.candidateTechId)
                              }
                              disabled={
                                !depPicker.candidateTechId || !!depLoading.techs
                              }
                            >
                              إضافة للقسم
                            </button>
                          </div>
                        )}

                        {/* جدول/بطاقات الفنيين */}
                        {depLoading.techs ? (
                          <BlockSkeleton />
                        ) : depTechs.length === 0 ? (
                          <EmptyState text="لا يوجد فنيون في هذا القسم." />
                        ) : (
                          <>
                            {/* Desktop table */}
                            <div className="hidden md:block overflow-x-auto">
                              <table className="min-w-[560px] w-full text-sm">
                                <thead>
                                  <tr className="text-right border-b">
                                    <Th>الاسم</Th>
                                    <Th>البريد</Th>
                                    <Th>الهاتف</Th>
                                    {allowAssign && <Th>إجراء</Th>}
                                  </tr>
                                </thead>
                                <tbody>
                                  {depTechs.map((t) => (
                                    <tr key={t._id} className="border-b">
                                      <Td>
                                        <div className="flex items-center gap-2">
                                          <span>
                                            {t.name || t.username || "-"}
                                          </span>
                                          {monitorId &&
                                            String(monitorId) ===
                                              String(t._id) && (
                                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                                                مراقب
                                              </span>
                                            )}
                                        </div>
                                      </Td>
                                      <Td>{t.email || "-"}</Td>
                                      <Td>{t.phone || "-"}</Td>
                                      {allowAssign && (
                                        <Td>
                                          <button
                                            className="px-2 py-1 text-xs rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-500/60 dark:text-rose-300 dark:hover:bg-rose-900/40"
                                            onClick={() =>
                                              unassignTech(d._id, t._id)
                                            }
                                            disabled={!!depLoading.techs}
                                          >
                                            إزالة من القسم
                                          </button>
                                        </Td>
                                      )}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Mobile cards */}
                            <div className="md:hidden grid gap-2">
                              {depTechs.map((t) => (
                                <div
                                  key={t._id}
                                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="font-medium">
                                      {t.name || t.username || "-"}
                                    </div>
                                    {monitorId &&
                                      String(monitorId) === String(t._id) && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                                          مراقب
                                        </span>
                                      )}
                                  </div>
                                  <div className="text-xs opacity-70 mt-1">
                                    {t.email || "—"}
                                  </div>
                                  <div className="text-xs opacity-70">
                                    {t.phone || "—"}
                                  </div>
                                  {allowAssign && (
                                    <div className="mt-2 flex justify-end">
                                      <button
                                        className="px-3 py-1 text-xs rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-500/60 dark:text-rose-300 dark:hover:bg-rose-900/40"
                                        onClick={() =>
                                          unassignTech(d._id, t._id)
                                        }
                                        disabled={!!depLoading.techs}
                                      >
                                        إزالة من القسم
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </section>
                    ) : (
                      <section className="grid gap-4">
                        {/* إحصاءات */}
                        {depLoading.stats ? (
                          <BlockSkeleton />
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <Chip
                              active={!depRep.statusFilter}
                              onClick={() => loadRepairs(d._id, "")}
                            >
                              الكل ({depStats.total || 0})
                            </Chip>
                            {Object.entries(depStats.byStatus || {}).map(
                              ([s, c]) => (
                                <Chip
                                  key={s}
                                  active={depRep.statusFilter === s}
                                  onClick={() => loadRepairs(d._id, s)}
                                >
                                  {(STATUS_LABELS[s] || s) + ` (${c})`}
                                </Chip>
                              )
                            )}
                            <button
                              className={`px-3 py-2 rounded-xl ${PALETTE.outline} ms-auto`}
                              onClick={() => {
                                loadStats(d._id);
                                loadRepairs(d._id, depRep.statusFilter || "");
                              }}
                            >
                              تحديث
                            </button>
                          </div>
                        )}

                        {/* قائمة الصيانة */}
                        {depLoading.repairs ? (
                          <BlockSkeleton />
                        ) : (depRep.list || []).length === 0 ? (
                          <EmptyState text="لا توجد عناصر." />
                        ) : (
                          <>
                            {/* Desktop table */}
                            <div className="hidden md:block overflow-x-auto">
                              <table className="min-w-[720px] w-full text-sm">
                                <thead>
                                  <tr className="text-right border-b">
                                    <Th>الكود</Th>
                                    <Th>الحالة</Th>
                                    <Th>الجهاز/العميل</Th>
                                    <Th>الفني</Th>
                                    <Th>آخر تحديث</Th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {depRep.list.map((r) => (
                                    <tr key={r._id} className="border-b">
                                      <Td className="font-mono">
                                        {r.code || r._id.slice(-6)}
                                      </Td>
                                      <Td>
                                        <StatusPill s={r.status} />
                                      </Td>
                                      <Td>
                                        <a
                                          href={`/repairs/${r._id}`}
                                          className="font-medium hover:underline"
                                        >
                                          {r.device?.model ||
                                            r.deviceType ||
                                            "-"}
                                        </a>
                                        {" / " +
                                          (r.customer?.name ||
                                            r.customerName ||
                                            "-")}
                                      </Td>
                                      <Td>
                                        {r.technician
                                          ? r.technician.name ||
                                            r.technician.username ||
                                            r.technician.email
                                          : "-"}
                                      </Td>
                                      <Td>
                                        {new Date(
                                          r.updatedAt || r.createdAt
                                        ).toLocaleString("ar-EG")}
                                      </Td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Mobile cards */}
                            <div className="md:hidden grid gap-2">
                              {depRep.list.map((r) => (
                                <div
                                  key={r._id}
                                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="font-mono text-sm">
                                      {r.code || r._id.slice(-6)}
                                    </div>
                                    <StatusPill s={r.status} />
                                  </div>
                                  <div className="text-sm text-[16px] mt-1">
                                    {r.device?.model || r.deviceType || "-"} /{" "}
                                    {r.customer?.name || r.customerName || "-"}
                                  </div>
                                  <div className="text-xs opacity-70 mt-1">
                                    الفنّي:{" "}
                                    {r.technician
                                      ? r.technician.name ||
                                        r.technician.username ||
                                        r.technician.email
                                      : "—"}
                                  </div>
                                  <div className="text-xs opacity-70">
                                    آخر تحديث:{" "}
                                    {new Date(
                                      r.updatedAt || r.createdAt
                                    ).toLocaleString("ar-EG")}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </section>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ===== مودال إنشاء/تعديل ===== */}
      {modalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-3">
          <form
            onSubmit={submit}
            className={`w-[560px] max-w-[92vw] p-5 rounded-2xl ${PALETTE.card} shadow-2xl`}
          >
            <h3 className="text-lg font-semibold mb-3">
              {editing ? "تعديل قسم" : "إضافة قسم"}
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-sm">اسم القسم</label>
                <input
                  className="w-full border rounded-xl px-3 py-2"
                  value={form.name}
                  onChange={(e) =>
                    setForm((v) => ({ ...v, name: e.target.value }))
                  }
                  placeholder="مثال: استقبال / هاردوير / سوفت"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 text-sm">الوصف (اختياري)</label>
                <input
                  className="w-full border rounded-xl px-3 py-2"
                  value={form.description}
                  onChange={(e) =>
                    setForm((v) => ({ ...v, description: e.target.value }))
                  }
                  placeholder="ملاحظات عن اختصاصات القسم"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                type="button"
                className={`px-3 py-2 rounded-xl ${PALETTE.outline}`}
                onClick={() => {
                  setModalOpen(false);
                  setEditing(null);
                }}
              >
                إلغاء
              </button>
              <button
                className={`px-4 py-2 rounded-xl ${PALETTE.primary} disabled:opacity-50`}
                disabled={formBusy}
              >
                {formBusy ? "جارٍ الحفظ…" : editing ? "تحديث" : "إضافة"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/* ================== عناصر واجهة ================== */
function Tabs({ value, onChange, items }) {
  return (
    <div className="rounded-2xl p-1 bg-slate-100 dark:bg-slate-800 w-full sm:w-max">
      <div className="grid grid-cols-2 gap-1">
        {items.map((t) => {
          const active = value === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onChange?.(t.id)}
              className={`px-4 py-2 rounded-xl text-sm text-[16px] transition ${
                active
                  ? "bg-white dark:bg-gray-900 shadow border border-slate-200 dark:border-slate-700"
                  : "opacity-70 hover:opacity-100"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Chip({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full border text-sm text-[16px] transition ${
        active
          ? "bg-indigo-600 text-white border-indigo-600"
          : "hover:bg-slate-50 dark:hover:bg-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

function StatusPill({ s }) {
  const cls = STATUS_CLASS[s] || STATUS_CLASS.unknown;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {STATUS_LABELS[s] || s || "—"}
    </span>
  );
}

function Th({ children }) {
  return (
    <th className="py-2 px-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
      {children}
    </th>
  );
}
function Td({ children, className = "" }) {
  return <td className={`py-2 px-2 align-top ${className}`}>{children}</td>;
}

function DeptSkeleton() {
  return (
    <div className="grid gap-4">
      {[0, 1, 2].map((k) => (
        <div
          key={k}
          className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-gray-900/60 animate-pulse"
        >
          <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
          <div className="h-3 w-80 bg-slate-200 dark:bg-slate-700 rounded mb-1" />
          <div className="h-3 w-60 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded mt-4" />
          <div className="h-3 w-3/4 bg-slate-200 dark:bg-slate-700 rounded mt-2" />
        </div>
      ))}
    </div>
  );
}
function BlockSkeleton() {
  return (
    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 animate-pulse">
      <div className="h-3 w-1/3 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
      <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded mb-1" />
      <div className="h-3 w-5/6 bg-slate-200 dark:bg-slate-700 rounded mb-1" />
      <div className="h-3 w-2/3 bg-slate-200 dark:bg-slate-700 rounded" />
    </div>
  );
}
function EmptyState({ text = "لا توجد بيانات." }) {
  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 text-center border border-slate-200 dark:border-slate-800">
      <div className="text-3xl mb-2">🔎</div>
      <div className="font-semibold mb-1">{text}</div>
      <div className="opacity-60 text-sm">جرّب التحديث لاحقًا.</div>
    </div>
  );
}
