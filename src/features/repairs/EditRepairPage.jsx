// src/features/repairs/EditRepairPage.jsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import API from "../../lib/api";
import { getRepair, updateRepair, updateRepairStatus } from "./repairsApi";
import useAuthStore from "../auth/authStore";
import formatDate from "../../utils/formatDate";
import statusOptions from "../../utils/statusOptions";
import DeliveryModal from "../../components/DeliveryModal";
import StatusSelect from "../../components/StatusSelect";
import VoiceInput from "../../components/VoiceInput";
import InputField from "../../components/InputField";

export default function EditRepairPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuthStore();

  const isAdmin = user?.role === "admin" || user?.permissions?.adminOverride;
  const canEditAll = isAdmin || user?.permissions?.editRepair;

  const [loading, setLoading] = useState(true);
  const [techs, setTechs] = useState([]);
  const [saving, setSaving] = useState(false);

  const [repair, setRepair] = useState(null);

  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    deviceType: "",
    color: "",
    issue: "",
    price: "",
    finalPrice: "",
    technician: "",
    recipient: "",
    notes: "",
    parts: [],
    status: "",
    createdAt: "",
    deliveryDate: "",
    startTime: "",
    endTime: "",
    returnDate: "",
    rejectedDeviceLocation: "",
  });

  // مودال التسليم
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [requirePassword, setRequirePassword] = useState(false);

  const isAssigned = useMemo(() => {
    if (!repair) return false;
    const techId = repair?.technician?._id || repair?.technician;
    const uid = user?.id || user?._id;
    return techId && uid && String(techId) === String(uid);
  }, [repair, user]);

  useEffect(() => {
    (async () => {
      try {
        const t = await API.get("/technicians").then((r) => r.data);
        setTechs(t);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await getRepair(id);
        setRepair(r);
        setForm({
          customerName: r.customerName || "",
          phone: r.phone || "",
          deviceType: r.deviceType || "",
          color: r.color || "",
          issue: r.issue || "",
          price: r.price ?? "",
          finalPrice: r.finalPrice ?? "",
          technician: r?.technician?._id || r.technician || "",
          recipient: r?.recipient?._id || r.recipient || "",
          notes: r.notes || "",
          parts: (r.parts || []).map((p) => ({
            name: p.name || "",
            cost: p.cost ?? "",
            supplier: p.supplier || "",
            source: p.source || "",
            purchaseDate: p.purchaseDate
              ? new Date(p.purchaseDate).toISOString().slice(0, 10)
              : "",
          })),
          status: r.status || "",
          createdAt: r.createdAt || "",
          deliveryDate: r.deliveryDate || "",
          startTime: r.startTime || "",
          endTime: r.endTime || "",
          returnDate: r.returnDate || "",
          rejectedDeviceLocation: r.rejectedDeviceLocation || "",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  function setField(k, v) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }
  function addPart() {
    setForm((prev) => ({
      ...prev,
      parts: [
        ...prev.parts,
        {
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

  async function submitGeneral() {
    if (!canEditAll) {
      alert("ليست لديك صلاحية تعديل كاملة. يمكنك تغيير الحالة فقط.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        customerName: form.customerName,
        phone: form.phone,
        deviceType: form.deviceType,
        color: form.color,
        issue: form.issue,
        price: form.price ? Number(form.price) : 0,
        finalPrice:
          form.finalPrice === "" ? undefined : Number(form.finalPrice),
        technician: form.technician || undefined,
        recipient: form.recipient || undefined,
        notes: form.notes,
        parts: form.parts.map((p) => ({
          name: p.name,
          cost: p.cost ? Number(p.cost) : 0,
          supplier: p.supplier || undefined,
          source: p.source || undefined,
          purchaseDate: p.purchaseDate
            ? new Date(p.purchaseDate).toISOString()
            : undefined,
        })),
        // مفيش تعديل حالة هنا (بنعدلها مباشرة بأسفل)
      };
      const updated = await updateRepair(id, payload);
      alert("تم حفظ التعديلات");
      nav(`/repairs/${updated._id}`);
    } catch (e) {
      alert(e?.response?.data?.message || "حدث خطأ");
    } finally {
      setSaving(false);
    }
  }

  async function onStatusChange(value) {
    if (!canEditAll && !isAssigned) return;

    if (value === "تم التسليم") {
      const needPw = !canEditAll && isAssigned;
      setRequirePassword(needPw);
      setDeliverOpen(true);
      return;
    }

    try {
      const body = { status: value };
      if (!canEditAll && isAssigned) {
        const password = window.prompt("ادخل كلمة السر لتأكيد تغيير الحالة");
        if (!password) return;
        body.password = password;
      }
      const updated = await updateRepairStatus(id, body);
      setRepair(updated);
      setField("status", updated.status || value);
      setField("deliveryDate", updated.deliveryDate || "");
      // لو اتحولت لمرفوض هنسيب اختيار المكان للسلكت أدناه
    } catch (e) {
      alert(e?.response?.data?.message || "فشل تغيير الحالة");
    }
  }

  async function changeRejectedLocation(loc) {
    try {
      const body = { status: "مرفوض", rejectedDeviceLocation: loc };
      if (!canEditAll && isAssigned) {
        const password = window.prompt(
          "ادخل كلمة السر لتأكيد تغيير مكان الجهاز"
        );
        if (!password) return;
        body.password = password;
      }
      const updated = await updateRepairStatus(id, body);
      setRepair(updated);
      setField("rejectedDeviceLocation", updated.rejectedDeviceLocation || loc);
      setField("deliveryDate", updated.deliveryDate || "");
    } catch (e) {
      alert(e?.response?.data?.message || "فشل تحديث مكان الجهاز");
    }
  }

  async function submitDelivery(payload) {
    try {
      const body = { status: "تم التسليم", ...payload };
      await updateRepair(id, body);
      setDeliverOpen(false);
      alert("تم التسليم بنجاح");
      const r = await getRepair(id);
      setRepair(r);
      setField("status", r.status || "تم التسليم");
      setField("finalPrice", r.finalPrice ?? payload.finalPrice);
      setField("deliveryDate", r.deliveryDate || new Date().toISOString());
      setField(
        "parts",
        (r.parts || []).map((p) => ({
          name: p.name || "",
          cost: p.cost ?? "",
          supplier: p.supplier || "",
          source: p.source || "",
          purchaseDate: p.purchaseDate
            ? new Date(p.purchaseDate).toISOString().slice(0, 10)
            : "",
        }))
      );
    } catch (e) {
      alert(e?.response?.data?.message || "خطأ أثناء إتمام التسليم");
    }
  }

  if (loading) return <div>جارِ التحميل...</div>;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">تعديل صيانة</h1>
        <Link
          to={`/repairs/${id}`}
          className="px-3 py-2 rounded-xl bg-gray-200 dark:bg-gray-700"
        >
          عودة للتفاصيل
        </Link>
      </header>

      {/* تغيير الحالة */}
      <section className="p-3 rounded-xl bg-white dark:bg-gray-800">
        <div className="grid md:grid-cols-3 gap-3 items-end">
          <div>
            <div className="text-sm opacity-80 mb-1">الحالة</div>
            <StatusSelect
              value={form.status}
              onChange={(v) => onStatusChange(v)}
              disabled={!canEditAll && !isAssigned}
            />
            {!canEditAll && isAssigned && (
              <div className="text-xs opacity-70 mt-1">
                عند اختيار “تم التسليم” سيُطلب كلمة السر.
              </div>
            )}

            {/* خانة مكان الجهاز تظهر فقط عند الرفض */}
            {form.status === "مرفوض" && (
              <div className="mt-2">
                <div className="text-sm opacity-80 mb-1">
                  مكان الجهاز عند الرفض
                </div>
                <select
                  value={form.rejectedDeviceLocation || "بالمحل"}
                  onChange={(e) => changeRejectedLocation(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200"
                  disabled={!canEditAll && !isAssigned}
                >
                  <option value="بالمحل">بالمحل</option>
                  <option value="مع العميل">مع العميل</option>
                </select>
                <div className="text-xs opacity-70 mt-1">
                  اختيار "مع العميل" يسجّل وقت التسليم تلقائيًا.
                </div>
              </div>
            )}
          </div>

          <Info label="تاريخ الإنشاء" value={formatDate(form.createdAt)} />
          <Info
            label="تاريخ التسليم"
            value={form.deliveryDate ? formatDate(form.deliveryDate) : "—"}
          />
        </div>
      </section>

      {/* الحقول العامة */}
      <section className="p-3 rounded-xl bg-white dark:bg-gray-800 grid md:grid-cols-2 gap-4">
        <div className="relative flex items-center justify-center box-with-icon">
          <InputField
            className="inp w-full"
            value={form.customerName}
            disabled={!canEditAll}
            onChange={(e) => setField("customerName", e.target.value)}
            placeholder="ادخل اسم العميل"
            required
          />
          <div className="">
            <VoiceInput onText={(text) => setField("customerName", text)} />
          </div>
        </div>
        <Field label="هاتف">
          <div className="relative flex items-center justify-center box-with-icon">
            <InputField
              className="inp w-full"
              value={form.phone}
              disabled={!canEditAll}
              onChange={(e) => setField("phone", e.target.value)}
              placeholder="ادخل رقم العميل"
              required
            />
            <div className="">
              <VoiceInput onText={(text) => setField("phone", text)} />
            </div>
          </div>
        </Field>
        <Field label="نوع الجهاز">
          <div className="relative flex items-center justify-center box-with-icon">
            <InputField
              className="inp w-full"
              value={form.deviceType}
              disabled={!canEditAll}
              onChange={(e) => setField("deviceType", e.target.value)}
              placeholder="ادخل نوع الجهاز"
              required
            />
            <div className="">
              <VoiceInput onText={(text) => setField("deviceType", text)} />
            </div>
          </div>
        </Field>
        <Field label="اللون">
          <div className="relative flex items-center justify-center box-with-icon">
            <InputField
              className="inp w-full"
              value={form.color}
              disabled={!canEditAll}
              onChange={(e) => setField("color", e.target.value)}
              placeholder="ادخل لون الجهاز"
              required
            />
            <div className="">
              <VoiceInput onText={(text) => setField("color", text)} />
            </div>
          </div>
        </Field>
        <Field label="العطل">
          <div className="relative flex items-center justify-center box-with-icon">
            <InputField
              className="inp w-full"
              value={form.issue}
              disabled={!canEditAll}
              onChange={(e) => setField("issue", e.target.value)}
              placeholder="ادخل العطل"
              required
            />
            <div className="">
              <VoiceInput onText={(text) => setField("issue", text)} />
            </div>
          </div>
        </Field>
        <Field label="السعر المتفق عليه">
          <div className="relative flex items-center justify-center box-with-icon">
            <InputField
              className="inp w-full"
              type="number"
              value={form.price}
              disabled={!canEditAll}
              onChange={(e) => setField("price", e.target.value)}
              placeholder="ادخل السعر المبدئي"
              required
            />
            <div className="">
              <VoiceInput onText={(text) => setField("price", text)} />
            </div>
          </div>
        </Field>
        <Field label="السعر النهائي">
          <div className="relative flex items-center justify-center box-with-icon">
            <InputField
              className="inp w-full"
              type="number"
              value={form.finalPrice}
              disabled={!canEditAll}
              onChange={(e) => setField("finalPrice", e.target.value)}
              placeholder="ادخل السعر النهائي"
              required
            />
            <div className="">
              <VoiceInput onText={(text) => setField("finalPrice", text)} />
            </div>
          </div>
        </Field>
        <Field label="الفني المسؤول">
          <select
            value={form.technician}
            onChange={(e) => setField("technician", e.target.value)}
            className="inp w-full"
            disabled={!canEditAll}
          >
            <option value="">—</option>
            {techs.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="ملاحظات">
          <div className="relative flex items-center justify-center box-with-icon">
            <InputField
              className="inp w-full"
              value={form.notes}
              disabled={!canEditAll}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="ادخل ملاحظاتك"
              required
            />
            <div className="">
              <VoiceInput onText={(text) => setField("notes", text)} />
            </div>
          </div>
        </Field>
      </section>

      {/* قطع الغيار */}
      <section className="p-3 rounded-xl bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">قطع الغيار</h2>
          {canEditAll && (
            <button
              onClick={addPart}
              className="px-3 py-1 rounded-lg bg-gray-200 dark:bg-gray-700"
            >
              + إضافة قطعة
            </button>
          )}
        </div>
        {form.parts.length === 0 ? (
          <div className="opacity-70">لا توجد قطع</div>
        ) : (
          <div className="overflow-x-auto repairs-parts-box w-full">
            <table className="w-full text-sm repair-parts-table">
              <thead>
                <tr className="text-right">
                  <th className="p-2">الاسم</th>
                  <th className="p-2">التكلفة</th>
                  <th className="p-2">المورد</th>
                  <th className="p-2">بواسطة</th>
                  <th className="p-2">تاريخ الشراء</th>
                  {canEditAll && <th className="p-2">حذف</th>}
                </tr>
              </thead>
              <tbody>
                {form.parts.map((p, i) => (
                  <tr
                    key={i}
                    className="odd:bg-gray-50 dark:odd:bg-gray-700/40"
                  >
                    <td className="p-2">
                      <input
                        value={p.name}
                        onChange={(e) => updatePart(i, "name", e.target.value)}
                        className="inp"
                        disabled={!canEditAll}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={p.cost}
                        onChange={(e) => updatePart(i, "cost", e.target.value)}
                        className="inp w-28"
                        disabled={!canEditAll}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        value={p.supplier}
                        onChange={(e) =>
                          updatePart(i, "supplier", e.target.value)
                        }
                        className="inp"
                        disabled={!canEditAll}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        value={p.source}
                        onChange={(e) =>
                          updatePart(i, "source", e.target.value)
                        }
                        className="inp"
                        disabled={!canEditAll}
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
                        disabled={!canEditAll}
                      />
                    </td>
                    {canEditAll && (
                      <td className="p-2">
                        <button
                          onClick={() => removePart(i)}
                          className="px-2 py-1 rounded-lg bg-red-500 text-white"
                        >
                          حذف
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="flex items-center gap-2">
        <button
          onClick={submitGeneral}
          disabled={saving || !canEditAll}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "جارِ الحفظ..." : "حفظ التعديلات"}
        </button>
        {!canEditAll && (
          <span className="text-sm opacity-70">
            يمكنك تغيير الحالة فقط عبر القائمة بالأعلى.
          </span>
        )}
      </div>

      {/* مودال التسليم */}
      <DeliveryModal
        open={deliverOpen}
        onClose={() => setDeliverOpen(false)}
        onSubmit={submitDelivery}
        initialFinalPrice={form.finalPrice || form.price || 0}
        initialParts={form.parts || []}
        requirePassword={!canEditAll && isAssigned}
      />
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="space-y-1 p-3 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center gap-2">
      <div className="text-sm opacity-80">{label}</div>
      {children}
      <style>{`.inp{padding:.5rem .75rem;border-radius:.75rem;background:var(--inp-bg,#f3f4f6);}`}</style>
    </label>
  );
}
function Info({ label, value }) {
  return (
    <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700">
      <div className="text-xs opacity-70">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
