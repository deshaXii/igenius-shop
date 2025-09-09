import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import InputField from "../../components/InputField";
import VoiceInput from "../../components/VoiceInput";
import QrAfterCreateModal from "../../components/QrAfterCreateModal";
import API, { RepairsAPI, DepartmentsAPI } from "../../lib/api";
/* جديد: مكوّنات اختيار الصنف والمورّد */
import InventoryItemSelect from "../../components/parts/InventoryItemSelect";
import SupplierSelect from "../../components/parts/SupplierSelect";

export default function NewRepairPage() {
  const nav = useNavigate();
  const [saving, setSaving] = useState(false);
  const [hasWarranty, setHasWarranty] = useState(false);

  const [qrOpen, setQrOpen] = useState(false);
  const [trackingUrl, setTrackingUrl] = useState("");
  const [createdRepair, setCreatedRepair] = useState(null);

  const [deps, setDeps] = useState([]);
  const [techs, setTechs] = useState([]);

  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    deviceType: "",
    color: "",
    issue: "",
    price: "",
    notes: "",
    parts: [],
    initialDepartment: "",
    technician: "", // اختياري
  });

  useEffect(() => {
    DepartmentsAPI.list().then(setDeps);
  }, []);

  useEffect(() => {
    if (form.initialDepartment) {
      API.get(`/technicians?department=${form.initialDepartment}`)
        .then((r) => setTechs(r.data))
        .catch(() => setTechs([]));
    } else {
      setTechs([]);
    }
  }, [form.initialDepartment]);

  function setField(k, v) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function addPart() {
    setForm((prev) => ({
      ...prev,
      parts: [
        ...prev.parts,
        {
          itemId: "",
          itemName: "",
          supplierId: "",
          paid: false,
          name: "",
          cost: "",
          supplier: "",
          source: "",
          purchaseDate: new Date().toISOString().slice(0, 10),
        },
      ],
    }));
  }
  function updatePart(i, k, v) {
    setForm((prev) => {
      const parts = prev.parts.slice();
      parts[i] = { ...parts[i], [k]: v };
      return { ...prev, parts };
    });
  }
  function removePart(i) {
    setForm((prev) => ({
      ...prev,
      parts: prev.parts.filter((_, idx) => idx !== i),
    }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.customerName || !form.deviceType) {
      alert("الرجاء إدخال اسم العميل ونوع الجهاز");
      return;
    }
    if (!form.initialDepartment) {
      alert("اختر القسم الابتدائي");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        customerName: form.customerName,
        phone: form.phone,
        deviceType: form.deviceType,
        color: form.color || undefined,
        issue: form.issue,
        hasWarranty,
        price: form.price ? Number(form.price) : 0,
        notes: form.notes || undefined,
        initialDepartment: form.initialDepartment,
        ...(form.technician ? { technician: form.technician } : {}),
        // إبقاء الـ payload متوافقًا مع الـ API الحالي
        parts: form.parts.map((p) => ({
          name: p.name,
          cost: p.cost ? Number(p.cost) : 0,
          supplier: p.supplier || undefined,
          source: p.source || undefined,
          purchaseDate: p.purchaseDate
            ? new Date(p.purchaseDate).toISOString()
            : undefined,
          // الحقول الإضافية واجهية فقط: itemId/itemName/supplierId/paid
        })),
      };

      const created = await RepairsAPI.create(payload);

      const token = created?.publicTracking?.token;
      const url = token ? `${window.location.origin}/t/${token}` : "";

      setCreatedRepair(created);
      setTrackingUrl(url);
      setQrOpen(true);
    } catch (e) {
      console.log(e);
      alert(e?.response?.data?.message || "حدث خطأ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">إضافة صيانة</h1>

      <section className="relative p-3 rounded-xl bg-white dark:bg-gray-800 grid md:grid-cols-2 gap-4">
        <Field label="اسم العميل">
          <div className="relative flex items-center justify-center box-with-icon">
            <InputField
              className="inp w-full"
              value={form.customerName}
              onChange={(e) => setField("customerName", e.target.value)}
              placeholder="ادخل اسم العميل"
              required
            />
            <div>
              <VoiceInput onText={(text) => setField("customerName", text)} />
            </div>
          </div>
        </Field>

        <Field label="هاتف">
          <div className="relative flex items-center justify-center box-with-icon">
            <InputField
              className="inp w-full"
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              placeholder="ادخل رقم الهاتف"
              required
            />
            <div>
              <VoiceInput onText={(text) => setField("phone", text)} />
            </div>
          </div>
        </Field>

        <Field label="نوع الجهاز">
          <div className="relative flex items-center justify-center box-with-icon">
            <InputField
              className="inp w-full"
              value={form.deviceType}
              onChange={(e) => setField("deviceType", e.target.value)}
              placeholder="ادخل نوع الجهاز"
              required
            />
            <div>
              <VoiceInput onText={(text) => setField("deviceType", text)} />
            </div>
          </div>
        </Field>

        <Field label="اللون">
          <div className="relative flex items-center justify-center box-with-icon">
            <InputField
              className="inp w-full"
              value={form.color}
              onChange={(e) => setField("color", e.target.value)}
              placeholder="ادخل اللون"
            />
            <div>
              <VoiceInput onText={(text) => setField("color", text)} />
            </div>
          </div>
        </Field>

        <Field label="العطل">
          <div className="relative flex items-center justify-center box-with-icon">
            <InputField
              className="inp w-full"
              value={form.issue}
              onChange={(e) => setField("issue", e.target.value)}
              placeholder="ادخل العطل"
              required
            />
            <div>
              <VoiceInput onText={(text) => setField("issue", text)} />
            </div>
          </div>

          <div className="warranty-box mt-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hasWarranty}
                onChange={(e) => setHasWarranty(e.target.checked)}
              />
              <span>الصيانة تحت ضمان</span>
            </label>
          </div>
        </Field>

        <Field label="السعر المبدئي">
          <div className="relative flex items-center justify-center box-with-icon">
            <InputField
              className="inp w-full"
              value={form.price}
              onChange={(e) => setField("price", e.target.value)}
              placeholder="ادخل السعر المبدئي"
            />
            <div>
              <VoiceInput onText={(text) => setField("price", text)} />
            </div>
          </div>
        </Field>

        <Field label="ملاحظات">
          <div className="relative flex items-center justify-center box-with-icon">
            <InputField
              className="inp w-full"
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="ادخل ملاحظاتك"
            />
            <div>
              <VoiceInput onText={(text) => setField("notes", text)} />
            </div>
          </div>
        </Field>
      </section>

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

      {/* قطع الغيار (الجدول الجديد) */}
      <section className="p-3 rounded-xl bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">قطع الغيار</h2>
          <button
            onClick={addPart}
            className="px-3 py-1 rounded-lg bg-gray-200 dark:bg-gray-700"
          >
            إضافة قطعة
          </button>
        </div>
        {form.parts.length === 0 ? (
          <div className="opacity-70">لا توجد قطع</div>
        ) : (
          <div className="overflow-x-auto repairs-parts-box w-full">
            <table className="w-full text-sm repair-parts-table">
              <thead>
                <tr className="text-right">
                  <th className="p-2">الصنف (من المخزن)</th>
                  <th className="p-2">اسم القطعة</th>
                  <th className="p-2">التكلفة</th>
                  <th className="p-2">المورد</th>
                  <th className="p-2">بواسطة</th>
                  <th className="p-2">تاريخ الشراء</th>
                  <th className="p-2">مدفوعة؟</th>
                  <th className="p-2">حذف</th>
                </tr>
              </thead>
              <tbody>
                {form.parts.map((p, i) => (
                  <tr
                    key={i}
                    className="odd:bg-gray-50 dark:odd:bg-gray-700/40"
                  >
                    <td className="p-2 min-w-[220px]">
                      <InventoryItemSelect
                        value={p.itemId || ""}
                        onChange={(id, obj) => {
                          updatePart(i, "itemId", id);
                          updatePart(i, "itemName", obj?.name || "");
                          if (!p.name && obj?.name)
                            updatePart(i, "name", obj.name);
                          if (
                            (p.cost === "" || p.cost === null) &&
                            typeof obj?.unitCost === "number"
                          ) {
                            updatePart(i, "cost", obj.unitCost);
                          }
                        }}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        value={p.name}
                        onChange={(e) => updatePart(i, "name", e.target.value)}
                        className="inp"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={p.cost}
                        onChange={(e) => updatePart(i, "cost", e.target.value)}
                        className="inp w-28"
                      />
                    </td>
                    <td className="p-2 min-w-[180px]">
                      <SupplierSelect
                        value={p.supplierId || ""}
                        onChange={(id, obj) => {
                          updatePart(i, "supplierId", id);
                          updatePart(
                            i,
                            "supplier",
                            obj ? (obj.isShop ? "المحل" : obj.name) : ""
                          );
                        }}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        value={p.source}
                        onChange={(e) =>
                          updatePart(i, "source", e.target.value)
                        }
                        className="inp"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="date"
                        value={p.purchaseDate || ""}
                        onChange={(e) =>
                          updatePart(i, "purchaseDate", e.target.value)
                        }
                        className="inp"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={!!p.paid}
                        onChange={(e) =>
                          updatePart(i, "paid", e.target.checked)
                        }
                      />
                    </td>
                    <td className="p-2">
                      <button
                        onClick={() => removePart(i)}
                        className="px-2 py-1 rounded-lg bg-red-500 text-white"
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <QrAfterCreateModal
        open={qrOpen}
        onClose={() => {
          setQrOpen(false);
          if (createdRepair?._id) {
            nav(`/repairs/${createdRepair._id}`);
          } else {
            nav("/repairs");
          }
        }}
        trackingUrl={trackingUrl}
        repair={createdRepair}
      />

      <div className="flex items-center gap-2">
        <button
          onClick={submit}
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "جارِ الحفظ..." : "حفظ الصيانة"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="space-y-1">
      <div className="text-sm opacity-80">{label}</div>
      {children}
      <style>
        {`.inp{padding:.5rem .75rem;border-radius:.75rem;background:var(--inp-bg,#f3f4f6);}`}
      </style>
    </label>
  );
}
