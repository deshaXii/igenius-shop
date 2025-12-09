// src/features/technicians/TechniciansPage.jsx
import { useEffect, useState } from "react";
import API from "../../lib/api";
import useAuthStore from "../auth/authStore";
import { Link } from "react-router-dom";

/* ===== Helpers ===== */
function cls(...a) {
  return a.filter(Boolean).join(" ");
}
function Skel({ className = "" }) {
  return (
    <div
      className={cls(
        "h-4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse",
        className
      )}
    />
  );
}
function Spinner({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cls("w-4 h-4 animate-spin", className)}
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      ></path>
    </svg>
  );
}

export default function TechniciansPage() {
  // refetch -> load
  useEffect(() => {
    const h = () => load();
    window.addEventListener("repairs:refresh", h);
    return () => window.removeEventListener("repairs:refresh", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin" || user?.permissions?.adminOverride;

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // إنشاء فني جديد (أدمن فقط)
  const [newTech, setNewTech] = useState({
    name: "",
    username: "",
    password: "",
    commissionPct: "",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [savingNew, setSavingNew] = useState(false);

  // حالات حفظ/حذف صف معيّن
  const [savingRowId, setSavingRowId] = useState(null);
  const [deletingRowId, setDeletingRowId] = useState(null);

  // فلترة محلية
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const res = await API.get("/technicians").then((r) => r.data || []);
      setList(
        res.map((t) => ({
          ...t,
          editing: false,
          editable: {
            name: t.name || "",
            username: t.username || "",
            commissionPct:
              typeof t.commissionPct === "number" ? t.commissionPct : "",
            password: "",
            addRepair: !!t?.permissions?.addRepair,
            editRepair: !!t?.permissions?.editRepair,
            deleteRepair: !!t?.permissions?.deleteRepair,
            receiveDevice: !!t?.permissions?.receiveDevice,
            accessAccounts: !!t?.permissions?.accessAccounts,
            adminOverride: !!t?.permissions?.adminOverride,
          },
        }))
      );
    } catch (e) {
      setErr(e?.response?.data?.message || "تعذر تحميل الفنيين");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createTech() {
    if (!newTech.name || !newTech.username || !newTech.password) {
      alert("أدخل الاسم واسم المستخدم وكلمة السر");
      return;
    }
    if (newTech.password.length < 4) {
      alert("كلمة السر لا تقل عن 4 أحرف");
      return;
    }
    const pct =
      newTech.commissionPct === "" ? null : Number(newTech.commissionPct);
    if (pct !== null && (isNaN(pct) || pct < 0 || pct > 100)) {
      alert("النسبة يجب أن تكون بين 0 و 100");
      return;
    }

    setSavingNew(true);
    try {
      await API.post("/technicians", {
        name: newTech.name,
        username: newTech.username,
        password: newTech.password,
        commissionPct: pct === null ? undefined : pct,
      });
      setNewTech({ name: "", username: "", password: "", commissionPct: "" });
      await load();
    } catch (e) {
      alert(e?.response?.data?.message || "خطأ أثناء إضافة الفني");
    } finally {
      setSavingNew(false);
    }
  }

  function toggleEdit(idx, on = null) {
    if (!isAdmin) return;
    setList((L) => {
      const A = [...L];
      const t = A[idx];
      const want = on === null ? !t.editing : !!on;
      if (want) {
        A[idx] = {
          ...t,
          editing: true,
          editable: {
            name: t.name || "",
            username: t.username || "",
            commissionPct:
              typeof t.commissionPct === "number" ? t.commissionPct : "",
            password: "",
            addRepair: !!t?.permissions?.addRepair,
            editRepair: !!t?.permissions?.editRepair,
            deleteRepair: !!t?.permissions?.deleteRepair,
            receiveDevice: !!t?.permissions?.receiveDevice,
            accessAccounts: !!t?.permissions?.accessAccounts,
            adminOverride: !!t?.permissions?.adminOverride,
          },
        };
      } else {
        A[idx] = { ...t, editing: false };
      }
      return A;
    });
  }

  async function saveRow(t, idx) {
    if (!isAdmin) return;
    setSavingRowId(t._id);
    try {
      const e = t.editable;
      const body = {
        name: e.name,
        username: e.username,
        commissionPct:
          e.commissionPct === "" ? undefined : Number(e.commissionPct),
        permissions: {
          addRepair: !!e.addRepair,
          editRepair: !!e.editRepair,
          deleteRepair: !!e.deleteRepair,
          receiveDevice: !!e.receiveDevice,
          accessAccounts: !!e.accessAccounts,
          adminOverride: !!e.adminOverride,
        },
      };
      if (e.password && e.password.length >= 4) body.password = e.password;

      await API.put(`/technicians/${t._id}`, body);

      // حدّث محليًا
      setList((L) => {
        const A = [...L];
        A[idx] = {
          ...A[idx],
          name: e.name,
          username: e.username,
          commissionPct: body.commissionPct ?? A[idx].commissionPct,
          permissions: body.permissions,
          editing: false,
        };
        return A;
      });
      alert("تم حفظ التعديلات");
    } catch (e) {
      alert(e?.response?.data?.message || "خطأ أثناء حفظ التعديلات");
    } finally {
      setSavingRowId(null);
    }
  }

  async function deleteRow(t) {
    if (!isAdmin) return;
    if (!confirm(`سيتم حذف الفني "${t.name}" نهائيًا. متأكد؟`)) return;
    setDeletingRowId(t._id);
    try {
      await API.delete(`/technicians/${t._id}`);
      setList((L) => L.filter((x) => x._id !== t._id));
    } catch (e) {
      alert(e?.response?.data?.message || "خطأ أثناء الحذف");
    } finally {
      setDeletingRowId(null);
    }
  }

  function setEditable(idx, key, value) {
    setList((L) => {
      const A = [...L];
      A[idx] = { ...A[idx], editable: { ...A[idx].editable, [key]: value } };
      return A;
    });
  }

  const filtered = list.filter((t) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return (
      (t.name || "").toLowerCase().includes(s) ||
      (t.username || "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">الفنيون</h1>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="بحث بالاسم أو اسم المستخدم"
          className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-sm text-[16px] w-64 max-w-full"
          aria-label="بحث عن فني"
        />
      </header>

      {/* إنشاء فني جديد (أدمن) */}
      {isAdmin && (
        <section className="p-3 rounded-xl bg-white dark:bg-gray-800 shadow-sm">
          <h2 className="font-semibold mb-2">إنشاء فني جديد</h2>
          <div className="grid md:grid-cols-5 gap-2">
            <input
              placeholder="الاسم"
              value={newTech.name}
              onChange={(e) => setNewTech({ ...newTech, name: e.target.value })}
              className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700"
            />
            <input
              placeholder="اسم المستخدم"
              value={newTech.username}
              onChange={(e) =>
                setNewTech({ ...newTech, username: e.target.value })
              }
              className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700"
            />
            <div className="relative">
              <input
                placeholder="كلمة السر"
                type={showPwd ? "text" : "password"}
                value={newTech.password}
                onChange={(e) =>
                  setNewTech({ ...newTech, password: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                className="absolute inset-y-0 left-2 my-auto text-xs opacity-70"
                aria-label={showPwd ? "إخفاء كلمة السر" : "إظهار كلمة السر"}
              >
                {showPwd ? "إخفاء" : "إظهار"}
              </button>
            </div>
            <input
              placeholder="نسبة مخصصة %"
              type="number"
              min="0"
              max="100"
              value={newTech.commissionPct}
              onChange={(e) =>
                setNewTech({ ...newTech, commissionPct: e.target.value })
              }
              className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700"
            />
            <button
              onClick={createTech}
              disabled={savingNew}
              className="px-3 py-2 rounded-xl bg-emerald-600 text-white inline-flex items-center gap-2 disabled:opacity-60"
            >
              {savingNew && <Spinner />} <span>إضافة</span>
            </button>
          </div>
        </section>
      )}

      {/* قائمة الفنيين */}
      <section className="p-3 rounded-xl bg-white dark:bg-gray-800 shadow-sm">
        {err && (
          <div className="p-3 rounded-xl bg-red-50 text-red-800 mb-3">
            {err}
          </div>
        )}

        {loading ? (
          <div className="grid gap-2 sm:hidden">
            <TechCardSkeleton />
            <TechCardSkeleton />
            <TechCardSkeleton />
          </div>
        ) : filtered.length === 0 ? (
          <div className="opacity-70">لا يوجد فنيون.</div>
        ) : (
          <>
            {/* Cards (mobile) */}
            <div className="grid gap-2 sm:hidden">
              {filtered.map((t, idx) => (
                <TechCard
                  key={t._id}
                  t={t}
                  idx={idx}
                  isAdmin={isAdmin}
                  savingRowId={savingRowId}
                  deletingRowId={deletingRowId}
                  onSetEditable={setEditable}
                  onToggleEdit={toggleEdit}
                  onSaveRow={saveRow}
                  onDeleteRow={deleteRow}
                />
              ))}
            </div>

            {/* Table (desktop) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-right">
                    <Th>الاسم</Th>
                    <Th>@المستخدم</Th>
                    <Th>صلاحيات</Th>
                    <Th>إجراءات</Th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t, idx) => (
                    <tr
                      key={t._id}
                      className="odd:bg-gray-50 dark:odd:bg-gray-700/40 align-top"
                    >
                      {/* الاسم */}
                      <Td>
                        {t.editing ? (
                          <input
                            className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 w-full"
                            value={t.editable.name}
                            onChange={(e) =>
                              setEditable(idx, "name", e.target.value)
                            }
                          />
                        ) : (
                          <>
                            <div className="font-medium">{t.name}</div>
                            <div className="text-xs opacity-60">
                              <Link
                                className="underline"
                                to={`/technicians/${t._id}/profile`}
                              >
                                بروفايل
                              </Link>
                              {" • "}
                              <Link
                                className="underline"
                                to={`/chat/dm/${t._id}`}
                              >
                                رسالة خاصة
                              </Link>
                            </div>
                          </>
                        )}
                      </Td>

                      {/* اسم المستخدم */}
                      <Td>
                        {t.editing ? (
                          <input
                            className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 w-full"
                            value={t.editable.username}
                            onChange={(e) =>
                              setEditable(idx, "username", e.target.value)
                            }
                          />
                        ) : (
                          <span>@{t.username}</span>
                        )}
                      </Td>

                      {/* الصلاحيات + تغيير كلمة السر عند التحرير */}
                      <Td>
                        {t.editing ? (
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-2">
                              <PermToggle
                                label="إضافة صيانة"
                                checked={t.editable.addRepair}
                                onChange={(v) =>
                                  setEditable(idx, "addRepair", v)
                                }
                              />
                              <PermToggle
                                label="تعديل صيانة"
                                checked={t.editable.editRepair}
                                onChange={(v) =>
                                  setEditable(idx, "editRepair", v)
                                }
                              />
                              <PermToggle
                                label="حذف صيانة"
                                checked={t.editable.deleteRepair}
                                onChange={(v) =>
                                  setEditable(idx, "deleteRepair", v)
                                }
                              />
                              <PermToggle
                                label="استلام جهاز"
                                checked={t.editable.receiveDevice}
                                onChange={(v) =>
                                  setEditable(idx, "receiveDevice", v)
                                }
                              />
                              <PermToggle
                                label="الحسابات/الإعدادات"
                                checked={t.editable.accessAccounts}
                                onChange={(v) =>
                                  setEditable(idx, "accessAccounts", v)
                                }
                              />
                              <PermToggle
                                label="صلاحيات أدمن"
                                checked={t.editable.adminOverride}
                                onChange={(v) =>
                                  setEditable(idx, "adminOverride", v)
                                }
                              />
                            </div>
                            <div className="grid md:grid-cols-2 gap-2">
                              <input
                                type="password"
                                className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700"
                                placeholder="تغيير كلمة السر (اختياري)"
                                value={t.editable.password}
                                onChange={(e) =>
                                  setEditable(idx, "password", e.target.value)
                                }
                              />
                              <div className="text-xs opacity-70 self-center">
                                اتركها فارغة إذا لا تريد تغيير كلمة السر.
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1 text-xs">
                            {t?.permissions?.addRepair && <Pill>إضافة</Pill>}
                            {t?.permissions?.editRepair && <Pill>تعديل</Pill>}
                            {t?.permissions?.deleteRepair && <Pill>حذف</Pill>}
                            {t?.permissions?.receiveDevice && (
                              <Pill>استلام</Pill>
                            )}
                            {t?.permissions?.accessAccounts && (
                              <Pill>حسابات</Pill>
                            )}
                            {t?.permissions?.adminOverride && <Pill>أدمن</Pill>}
                            {!t?.permissions && (
                              <span className="opacity-60">—</span>
                            )}
                          </div>
                        )}
                      </Td>

                      {/* إجراءات */}
                      <Td className="align-middle">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {isAdmin &&
                            (t.editing ? (
                              <>
                                <button
                                  onClick={() => saveRow(t, idx)}
                                  disabled={savingRowId === t._id}
                                  className="px-3 py-1 rounded-lg bg-blue-600 text-white inline-flex items-center gap-2 disabled:opacity-60"
                                >
                                  {savingRowId === t._id && <Spinner />}{" "}
                                  <span>حفظ</span>
                                </button>
                                <button
                                  onClick={() => toggleEdit(idx, false)}
                                  className="px-3 py-1 rounded-lg bg-gray-200 dark:bg-gray-700"
                                >
                                  إلغاء
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => toggleEdit(idx, true)}
                                className="px-3 py-1 rounded-lg bg-amber-500 text-white"
                              >
                                تعديل
                              </button>
                            ))}

                          {isAdmin && (
                            <button
                              onClick={() => deleteRow(t)}
                              disabled={deletingRowId === t._id}
                              className="px-3 py-1 rounded-lg bg-red-600 text-white disabled:opacity-60"
                            >
                              {deletingRowId === t._id
                                ? "جارٍ الحذف..."
                                : "حذف"}
                            </button>
                          )}
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

/* ===== Mobile Card ===== */
function TechCard({
  t,
  idx,
  isAdmin,
  savingRowId,
  deletingRowId,
  onSetEditable,
  onToggleEdit,
  onSaveRow,
  onDeleteRow,
}) {
  return (
    <article className="p-3 rounded-xl border border-gray-200 dark:border-gray-700">
      {/* رأس */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          {t.editing ? (
            <input
              className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700"
              value={t.editable.name}
              onChange={(e) => onSetEditable(idx, "name", e.target.value)}
              placeholder="اسم الفني"
            />
          ) : (
            <div className="text-sm text-[16px] font-semibold">{t.name}</div>
          )}
          <div className="text-xs opacity-70">
            {t.editing ? (
              <input
                className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700"
                value={t.editable.username}
                onChange={(e) => onSetEditable(idx, "username", e.target.value)}
                placeholder="اسم المستخدم"
              />
            ) : (
              <>@{t.username}</>
            )}
          </div>
          {!t.editing && (
            <div className="text-xs opacity-60">
              <Link className="underline" to={`/technicians/${t._id}/profile`}>
                بروفايل
              </Link>
              {" • "}
              <Link className="underline" to={`/chat/dm/${t._id}`}>
                رسالة خاصة
              </Link>
            </div>
          )}
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            {t.editing ? (
              <>
                <button
                  onClick={() => onSaveRow(t, idx)}
                  disabled={savingRowId === t._id}
                  className="px-3 py-1 rounded-lg bg-blue-600 text-white inline-flex items-center gap-2 disabled:opacity-60"
                >
                  {savingRowId === t._id && <Spinner />} <span>حفظ</span>
                </button>
                <button
                  onClick={() => onToggleEdit(idx, false)}
                  className="px-3 py-1 rounded-lg bg-gray-200 dark:bg-gray-700"
                >
                  إلغاء
                </button>
              </>
            ) : (
              <button
                onClick={() => onToggleEdit(idx, true)}
                className="px-3 py-1 rounded-lg bg-amber-500 text-white"
              >
                تعديل
              </button>
            )}
            <button
              onClick={() => onDeleteRow(t)}
              disabled={deletingRowId === t._id}
              className="px-3 py-1 rounded-lg bg-red-600 text-white disabled:opacity-60"
            >
              {deletingRowId === t._id ? "جارٍ الحذف..." : "حذف"}
            </button>
          </div>
        )}
      </div>

      {/* صلاحيات */}
      <div className="mt-3">
        {t.editing ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <PermToggle
                label="إضافة صيانة"
                checked={t.editable.addRepair}
                onChange={(v) => onSetEditable(idx, "addRepair", v)}
              />
              <PermToggle
                label="تعديل صيانة"
                checked={t.editable.editRepair}
                onChange={(v) => onSetEditable(idx, "editRepair", v)}
              />
              <PermToggle
                label="حذف صيانة"
                checked={t.editable.deleteRepair}
                onChange={(v) => onSetEditable(idx, "deleteRepair", v)}
              />
              <PermToggle
                label="استلام جهاز"
                checked={t.editable.receiveDevice}
                onChange={(v) => onSetEditable(idx, "receiveDevice", v)}
              />
              <PermToggle
                label="الحسابات/الإعدادات"
                checked={t.editable.accessAccounts}
                onChange={(v) => onSetEditable(idx, "accessAccounts", v)}
              />
              <PermToggle
                label="صلاحيات أدمن"
                checked={t.editable.adminOverride}
                onChange={(v) => onSetEditable(idx, "adminOverride", v)}
              />
            </div>
            <input
              type="password"
              className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 w-full"
              placeholder="تغيير كلمة السر (اختياري)"
              value={t.editable.password}
              onChange={(e) => onSetEditable(idx, "password", e.target.value)}
            />
          </div>
        ) : (
          <div className="flex flex-wrap gap-1 text-xs">
            {t?.permissions?.addRepair && <Pill>إضافة</Pill>}
            {t?.permissions?.editRepair && <Pill>تعديل</Pill>}
            {t?.permissions?.deleteRepair && <Pill>حذف</Pill>}
            {t?.permissions?.receiveDevice && <Pill>استلام</Pill>}
            {t?.permissions?.accessAccounts && <Pill>حسابات</Pill>}
            {t?.permissions?.adminOverride && <Pill>أدمن</Pill>}
            {!t?.permissions && <span className="opacity-60">—</span>}
          </div>
        )}
      </div>
    </article>
  );
}

function TechCardSkeleton() {
  return (
    <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700">
      <Skel className="w-32" />
      <Skel className="w-24 mt-2" />
      <div className="grid grid-cols-3 gap-2 mt-3">
        <Skel />
        <Skel />
        <Skel />
      </div>
    </div>
  );
}

/* ===== Small UI Bits ===== */
function PermToggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-xs">{label}</span>
    </label>
  );
}

function Pill({ children }) {
  return (
    <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">
      {children}
    </span>
  );
}

function Th({ children }) {
  return (
    <th className="p-2 text-xs font-semibold text-gray-600 dark:text-gray-300 border-b">
      {children}
    </th>
  );
}
function Td({ children, className = "" }) {
  return <td className={cls("p-2", className)}>{children}</td>;
}
