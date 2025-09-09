import { useEffect, useState } from "react";
import api, { RepairsAPI, DepartmentsAPI } from "../../lib/api";

export default function RepairForm({ onCreated }) {
  const [form, setForm] = useState({
    /* ...حقولك الحالية... */ initialDepartment: "",
    technician: "",
  });
  const [deps, setDeps] = useState([]);
  const [techs, setTechs] = useState([]);

  useEffect(() => {
    DepartmentsAPI.list().then(setDeps);
  }, []);

  useEffect(() => {
    if (form.initialDepartment) {
      api
        .get(`/technicians?department=${form.initialDepartment}`)
        .then((r) => setTechs(r.data));
    } else {
      setTechs([]);
    }
  }, [form.initialDepartment]);

  async function submit(e) {
    e.preventDefault();
    const payload = { ...form };
    if (!payload.technician) delete payload.technician; // اختياري
    const created = await RepairsAPI.create(payload);
    onCreated?.(created);
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      {/* ...حقولك الحالية... */}

      <div>
        <label className="block mb-1 text-sm">القسم الابتدائي</label>
        <select
          className="border rounded-lg px-3 py-2 w-full"
          value={form.initialDepartment}
          onChange={(e) =>
            setForm((v) => ({ ...v, initialDepartment: e.target.value }))
          }
          required
        >
          <option value="">— اختر قسمًا —</option>
          {deps.map((d) => (
            <option key={d._id} value={d._id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block mb-1 text-sm">فنّي (اختياري)</label>
        <select
          className="border rounded-lg px-3 py-2 w-full"
          value={form.technician}
          onChange={(e) =>
            setForm((v) => ({ ...v, technician: e.target.value }))
          }
          disabled={!form.initialDepartment}
        >
          <option value="">— بدون تعيين —</option>
          {techs.map((t) => (
            <option key={t._id} value={t._id}>
              {t.name || t.username || t.email}
            </option>
          ))}
        </select>
      </div>

      <button className="px-4 py-2 rounded-lg bg-black text-white">حفظ</button>
    </form>
  );
}
