import { useEffect, useMemo, useState } from "react";
import { createSupplier, listSuppliers } from "../../lib/suppliersApi";
import { Link } from "react-router-dom";
import useAuthStore from "../auth/authStore";

export default function SuppliersPage() {
  const { user } = useAuthStore();
  const canManage = user?.role === "admin" || user?.permissions?.adminOverride;

  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ name: "", phone: "" });

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return list;
    return list.filter(
      (s) =>
        (s.name || "").toLowerCase().includes(t) || (s.phone || "").includes(t)
    );
  }, [list, q]);

  async function load() {
    const data = await listSuppliers();
    setList(data);
  }
  useEffect(() => {
    load();
  }, []);

  async function add(e) {
    e.preventDefault();
    if (!canManage) return alert("ليست لديك صلاحيات إضافة مورد");
    await createSupplier({ name: form.name.trim(), phone: form.phone.trim() });
    setForm({ name: "", phone: "" });
    await load();
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">الموردون</h1>
      </header>

      <div className="p-3 rounded-2xl bg-white dark:bg-gray-800 grid md:grid-cols-3 gap-2">
        <input
          className="inp"
          placeholder="بحث بالاسم/الهاتف"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {canManage && (
          <form
            onSubmit={add}
            className="md:col-span-2 grid sm:grid-cols-3 gap-2"
          >
            <input
              className="inp"
              placeholder="اسم المورد *"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="inp"
              placeholder="هاتف (اختياري)"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <button className="px-4 py-2 rounded-xl bg-blue-600 text-white">
              إضافة مورد
            </button>
          </form>
        )}
      </div>

      <section className="p-3 rounded-2xl bg-white dark:bg-gray-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-right">
              <Th>الاسم</Th>
              <Th>الهاتف</Th>
              <Th>النوع</Th>
              <Th>فتح</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr
                key={s._id}
                className="odd:bg-gray-50 dark:odd:bg-gray-700/40"
              >
                <Td className="font-medium">{s.isShop ? "المحل" : s.name}</Td>
                <Td>{s.phone || "—"}</Td>
                <Td>{s.isShop ? "داخلي" : "خارجي"}</Td>
                <Td>
                  <Link
                    to={`/suppliers/${s._id}`}
                    className="px-3 py-1 rounded-lg bg-gray-200 dark:bg-gray-700"
                  >
                    فتح
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <style>{`.inp{padding:.5rem .75rem;border-radius:.75rem;background:var(--inp-bg,#f3f4f6);}`}</style>
    </div>
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
  return <td className={`p-2 ${className}`}>{children}</td>;
}
