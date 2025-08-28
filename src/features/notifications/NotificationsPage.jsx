// src/features/notifications/NotificationsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API from "../../lib/api";
import formatDate from "../../utils/formatDate";

export default function NotificationsPage() {
  // ===== events (push refresh) =====
  useEffect(() => {
    const h = () => refetch();
    window.addEventListener("notifications:refresh", h);
    window.addEventListener("repairs:refresh", h);
    return () => {
      window.removeEventListener("notifications:refresh", h);
      window.removeEventListener("repairs:refresh", h);
    };
  }, []);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState({}); // repairId => bool
  const [metaMap, setMetaMap] = useState({}); // repairId => { deviceType, repairIdNum }
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  async function refetch() {
    try {
      setLoading(true);
      const { data } = await API.get("/notifications");
      setItems(data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const { data } = await API.get(
        "/notifications?includeLog=true&friendly=true"
      );
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.response?.data?.message || "تعذر تحميل الإشعارات");
    } finally {
      setLoading(false);
    }
  }

  async function clearAll() {
    if (!confirm("مسح كل الإشعارات؟")) return;
    await API.delete("/notifications/clear");
    await load();
  }

  // ===== fetch repairs meta once per group =====
  const filteredItems = useMemo(
    () => (showUnreadOnly ? items.filter((i) => !i.read) : items),
    [items, showUnreadOnly]
  );

  const groups = useMemo(() => {
    const map = new Map();
    for (const n of filteredItems) {
      const key = n?.meta?.repairId || "—";
      if (!map.has(key)) map.set(key, { key, items: [], unread: 0, lastAt: 0 });
      map.get(key).items.push(n);
      if (!n.read) map.get(key).unread++;
      const t = new Date(n.createdAt).getTime();
      if (t > map.get(key).lastAt) map.get(key).lastAt = t;
    }
    const arr = Array.from(map.values()).map((g) => {
      g.items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return g;
    });
    // افتح اللي فيه غير مقروء
    const initOpen = {};
    arr.forEach((g) => {
      if (g.unread > 0) initOpen[g.key] = true;
    });
    setOpen((prev) => ({ ...initOpen, ...prev }));
    // أحدث الجروبات أولاً
    return arr.sort((a, b) => b.lastAt - a.lastAt);
  }, [filteredItems]);

  useEffect(() => {
    (async () => {
      const ids = groups.map((g) => g.key).filter((k) => k && k !== "—");
      const need = ids.filter((id) => !metaMap[id]);
      if (!need.length) return;
      const newMeta = {};
      await Promise.all(
        need.map(async (id) => {
          try {
            const r = await API.get(`/repairs/${id}`).then((x) => x.data);
            newMeta[id] = {
              deviceType: r?.deviceType || "—",
              repairIdNum: r?.repairId || "—",
            };
          } catch {
            newMeta[id] = { deviceType: "—", repairIdNum: "—" };
          }
        })
      );
      setMetaMap((prev) => ({ ...prev, ...newMeta }));
    })();
  }, [groups]);

  async function markRead(id, read = true) {
    try {
      await API.patch(`/notifications/${id}/read`, { read });
      setItems((prev) => prev.map((x) => (x._id === id ? { ...x, read } : x)));
    } catch (e) {
      alert(e?.response?.data?.message || "تعذر تحديث حالة الإشعار");
    }
  }

  async function markGroupRead(repairId) {
    const ids = groups.find((g) => g.key === repairId)?.items.map((n) => n._id);
    if (!ids?.length) return;
    try {
      await API.post(`/notifications/mark-read`, { ids, read: true });
      setItems((prev) =>
        prev.map((n) =>
          n?.meta?.repairId === repairId ? { ...n, read: true } : n
        )
      );
    } catch (e) {
      alert(e?.response?.data?.message || "تعذر تعليم المجموعة كمقروءة");
    }
  }

  const totalUnread = useMemo(
    () => items.filter((i) => !i.read).length,
    [items]
  );

  return (
    <div className="mx-auto max-w-3xl px-3 py-4 space-y-4">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">الإشعارات</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600 text-white">
            غير مقروء: {totalUnread}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800">
            <input
              type="checkbox"
              className="h-4 w-4 accent-blue-600"
              checked={showUnreadOnly}
              onChange={(e) => setShowUnreadOnly(e.target.checked)}
            />
            عرض غير المقروء فقط
          </label>
          <button
            onClick={load}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            تحديث
          </button>
          <button
            onClick={clearAll}
            className="px-3 py-2 rounded-xl bg-red-600 text-white"
          >
            مسح الكل
          </button>
        </div>
      </header>

      {err && (
        <div className="p-3 rounded-xl bg-red-50 text-red-800">{err}</div>
      )}

      {/* Loading skeleton */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-2xl bg-white dark:bg-gray-800 animate-pulse"
            />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="p-8 rounded-2xl bg-white dark:bg-gray-800 text-center">
          لا توجد إشعارات {showUnreadOnly ? "غير مقروءة" : ""}
        </div>
      ) : (
        groups.map((g) => {
          const meta = metaMap[g.key] || {};
          const headUnread = g.unread > 0;
          const isOpen = !!open[g.key];

          return (
            <section
              key={g.key}
              className={`rounded-2xl border transition-colors ${
                headUnread
                  ? "bg-blue-50/60 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800"
                  : "bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700"
              }`}
            >
              {/* Group header */}
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen((p) => ({ ...p, [g.key]: !p[g.key] }))}
                className="w-full text-right p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      headUnread
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-100"
                    }`}
                    title={
                      headUnread ? "لديك إشعارات غير مقروءة" : "لا يوجد جديد"
                    }
                  >
                    {headUnread ? g.unread : "✓"}
                  </span>
                  <div className="font-semibold">
                    صيانة جهاز {meta.deviceType || "—"} #
                    {meta.repairIdNum || "—"}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs opacity-70">
                    آخر تحديث:{" "}
                    {g.items[0]?.createdAt
                      ? formatDate(g.items[0].createdAt)
                      : "—"}
                  </span>
                  <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 hidden sm:block" />
                  <Link
                    to={g.key !== "—" ? `/repairs/${g.key}` : "#"}
                    onClick={(e) => e.stopPropagation()}
                    className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
                  >
                    فتح الصيانة
                  </Link>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markGroupRead(g.key);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm"
                  >
                    تعليم كمقروء
                  </button>
                  <span
                    className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm"
                    aria-hidden
                  >
                    {isOpen ? "إخفاء" : "عرض"}
                  </span>
                </div>
              </button>

              {/* Group body */}
              {isOpen && (
                <div className="px-4 pb-4">
                  <ul className="space-y-2">
                    {g.items.map((n) => (
                      <li
                        key={n._id}
                        className={`p-3 rounded-xl border transition-colors ${
                          n.read
                            ? "bg-gray-50 border-gray-200 dark:bg-gray-800/60 dark:border-gray-700"
                            : "bg-white border-blue-200 ring-1 ring-blue-100 dark:bg-gray-800 dark:border-blue-800 dark:ring-blue-900/30"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="space-y-1">
                            {Array.isArray(n?.meta?.changes) &&
                            n.meta.changes.length ? (
                              <>
                                <div className="font-medium">
                                  {n.message || "تحديث صيانة"}
                                </div>
                                <ul className="list-disc pr-5 space-y-1 text-sm">
                                  {n.meta.changes.map((c, i) => (
                                    <li key={i}>
                                      تم تغيير{" "}
                                      <strong>{labelOf(c.field)}</strong> من{" "}
                                      <code className="px-1 rounded bg-gray-100 dark:bg-gray-700">
                                        {briefVal(c.from, c.field)}
                                      </code>{" "}
                                      إلى{" "}
                                      <code className="px-1 rounded bg-gray-100 dark:bg-gray-700">
                                        {briefVal(c.to, c.field)}
                                      </code>
                                    </li>
                                  ))}
                                </ul>
                              </>
                            ) : (
                              <div className="font-medium">{n.message}</div>
                            )}
                            <div className="text-xs opacity-70">
                              {formatDate(n.createdAt)}
                            </div>
                          </div>

                          <div className="flex gap-2 shrink-0">
                            {!n.read ? (
                              <button
                                onClick={() => markRead(n._id, true)}
                                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm"
                              >
                                تعليم كمقروء
                              </button>
                            ) : (
                              <button
                                onClick={() => markRead(n._id, false)}
                                className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm"
                              >
                                إعادة كغير مقروء
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}

/* ===== Helpers ===== */
function labelOf(field) {
  const map = {
    status: "الحالة",
    finalPrice: "السعر النهائي",
    price: "السعر",
    technician: "الفني",
    deliveryDate: "تاريخ التسليم",
    rejectedDeviceLocation: "مكان الجهاز",
    parts: "قطع الغيار",
  };
  return map[field] || field;
}
function briefVal(v, field) {
  if (v === null || v === undefined || v === "") return "—";
  if (field === "deliveryDate") return formatDate(v);
  if (typeof v === "boolean") return v ? "نعم" : "لا";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v;
  try {
    const s = JSON.stringify(v);
    return s.length > 50 ? s.slice(0, 50) + "…" : s;
  } catch {
    return "—";
  }
}
