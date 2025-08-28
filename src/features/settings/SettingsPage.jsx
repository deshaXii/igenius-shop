// src/features/settings/SettingsPage.jsx
import { useEffect, useState } from "react";
import API from "../../lib/api";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [defaultPct, setDefaultPct] = useState(50);
  const [techs, setTechs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savingTech, setSavingTech] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const s = await API.get("/settings").then((r) => r.data);
      setDefaultPct(s?.defaultTechCommissionPct ?? 50);
      const t = await API.get("/technicians").then((r) => r.data);
      setTechs(t);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveDefault() {
    try {
      setSaving(true);
      await API.put("/settings", {
        defaultTechCommissionPct: Number(defaultPct),
      });
      alert("تم الحفظ");
    } catch (e) {
      alert(e?.response?.data?.message || "خطأ");
    } finally {
      setSaving(false);
    }
  }

  async function saveTechPct(id, pct) {
    try {
      setSavingTech(id);
      await API.put(`/settings/technicians/${id}/commission`, {
        commissionPct: Number(pct),
      });
      alert("تم الحفظ");
    } catch (e) {
      alert(e?.response?.data?.message || "خطأ");
    } finally {
      setSavingTech(null);
    }
  }

  if (loading) return <div>جارِ التحميل...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">الإعدادات</h1>

      <section className="p-3 rounded-xl bg-white dark:bg-gray-800">
        <h2 className="font-semibold mb-2">النسبة الافتراضية للفنيين</h2>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            max="100"
            value={defaultPct}
            onChange={(e) => setDefaultPct(e.target.value)}
            className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 w-28"
          />
          <span>%</span>
          <button
            onClick={saveDefault}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:opacity-90 disabled:opacity-50"
          >
            حفظ
          </button>
        </div>
      </section>

      <section className="p-3 rounded-xl bg-white dark:bg-gray-800">
        <h2 className="font-semibold mb-2">نِسَب مخصصة لفنيين</h2>
        <div className="space-y-2">
          {techs.map((t) => (
            <TechRow
              key={t._id}
              tech={t}
              onSave={saveTechPct}
              saving={savingTech === t._id}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function TechRow({ tech, onSave, saving }) {
  const [pct, setPct] = useState(tech.commissionPct ?? "");

  return (
    <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
      <div>
        {tech.name} <span className="opacity-70">(@{tech.username})</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          max="100"
          placeholder="افتراضي"
          value={pct}
          onChange={(e) => setPct(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white dark:bg-gray-800 w-28"
        />
        <span>%</span>
        <button
          onClick={() => onSave(tech._id, pct === "" ? 50 : pct)}
          disabled={saving}
          className="px-3 py-2 rounded-xl bg-emerald-600 text-white hover:opacity-90 disabled:opacity-50"
        >
          حفظ
        </button>
      </div>
    </div>
  );
}
