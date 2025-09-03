import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import API from "../../lib/api";
import { getRepair, updateRepair, updateRepairStatus, setWarranty } from "./repairsApi";
import useAuthStore from "../auth/authStore";
import formatDate from "../../utils/formatDate";
import DeliveryModal from "../../components/DeliveryModal";
import StatusSelect from "../../components/StatusSelect";
import VoiceInput from "../../components/VoiceInput";
import InputField from "../../components/InputField";

/* ========= Helpers ========= */
function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function includeNumberField(obj, key, val) {
  // لا تضيف الحقل لو فاضي، ولو فيه رقم صالح حوّله Number
  if (val === "" || val === null || val === undefined) return obj;
  const n = Number(val);
  return Number.isFinite(n) ? { ...obj, [key]: n } : obj;
}
function normalizeLoadedRepair(r) {
  return {
    ...r,
    price: toNum(r.price) ?? r.price,
    finalPrice: toNum(r.finalPrice) ?? r.finalPrice,
  };
}

export default function EditRepairPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuthStore();

  const isAdmin = user?.role === "admin" || user?.permissions?.adminOverride;
  const canEditAll = isAdmin || user?.permissions?.editRepair;

  const [deliverOpen, setDeliverOpen] = useState(false);
  const [requirePassword, setRequirePassword] = useState(false);

  const [loading, setLoading] = useState(true);
  const [techs, setTechs] = useState([]);
  const [saving, setSaving] = useState(false);

  const [hasWarranty, setHasWarranty] = useState(false);
  const [warrantyNotes, setWarrantyNotes] = useState("");
  const [warrantyEnd, setWarrantyEnd] = useState("");

  const [repair, setRepair] = useState(null);

  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    deviceType: "",
    color: "",
    issue: "",
    price: "",
    finalPrice: "",
    warrantyEnd: "",
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

  // مودالات الضمان مثل صفحة التفاصيل
  const [afterCompleteOpen, setAfterCompleteOpen] = useState(false);
  const [showWarrantyModal, setShowWarrantyModal] = useState(false);

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
        const r0 = await getRepair(id);
        const r = normalizeLoadedRepair(r0);
        setRepair(r);
        setForm({
          customerName: r.customerName || "",
          phone: r.phone || "",
          deviceType: r.deviceType || "",
          color: r.color || "",
          issue: r.issue || "",
          price: r.price ?? "",
          warrantyEnd: r.warrantyEnd ?? "",
          finalPrice: r.finalPrice ?? "",
          technician: r?.technician?._id || r.technician || "",
          recipient: r?.recipient?._id || r.recipient || "",
          notes: r.notes || "",
          parts: (r.parts || []).map((p) => ({
            name: p.name || "",
            cost: p.cost ?? "",
            supplier: p.supplier || "",
            source: p.source || "",
            purchaseDate: p.purchaseDate ? new Date(p.purchaseDate).toISOString().slice(0, 10) : "",
          })),
          status: r.status || "",
          createdAt: r.createdAt || "",
          deliveryDate: r.deliveryDate || "",
          startTime: r.startTime || "",
          endTime: r.endTime || "",
          returnDate: r.returnDate || "",
          rejectedDeviceLocation: r.rejectedDeviceLocation || "",
        });
        setHasWarranty(!!r.hasWarranty);
        setWarrantyEnd(r.warrantyEnd ? String(r.warrantyEnd).slice(0, 10) : "");
        setWarrantyNotes(r.warrantyNotes || "");
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
        { name: "", cost: "", supplier: "", source: "", purchaseDate: new Date().toISOString().slice(0, 10) },
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
    setForm((prev) => ({ ...prev, parts: prev.parts.filter((_, idx) => idx !== i) }));
  }

  async function submitGeneral() {
    if (!canEditAll) {
      alert("ليست لديك صلاحية تعديل كاملة. يمكنك تغيير الحالة فقط.");
      return;
    }
    setSaving(true);
    try {
      let payload = {
        customerName: form.customerName,
        phone: form.phone,
        deviceType: form.deviceType,
        color: form.color,
        issue: form.issue,
        technician: form.technician || undefined,
        recipient: form.recipient || undefined,
        notes: form.notes,
        parts: form.parts.map((p) => ({
          name: p.name,
          cost: p.cost === "" || p.cost === null || p.cost === undefined ? 0 : Number(p.cost),
          supplier: p.supplier || undefined,
          source: p.source || undefined,
          purchaseDate: p.purchaseDate ? new Date(p.purchaseDate).toISOString() : undefined,
        })),
        hasWarranty,
        ...(warrantyEnd ? { warrantyEnd } : {}),
        ...(warrantyNotes ? { warrantyNotes } : {}),
        // لا نغيّر الحالة هنا
      };

      // ضف الحقول الرقمية فقط لو لها قيمة
      payload = includeNumberField(payload, "price", form.price);
      payload = includeNumberField(payload, "finalPrice", form.finalPrice);

      const updated0 = await updateRepair(id, payload);
      const updated = normalizeLoadedRepair(updated0);
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
      setRequirePassword(!canEditAll && isAssigned);
      setDeliverOpen(true);
      return;
    }

    if (value === "مرفوض") {
      const body = { status: "مرفوض" };
      if (!canEditAll && isAssigned) {
        const password = window.prompt("ادخل كلمة السر لتأكيد تغيير الحالة");
        if (!password) return;
        body.password = password;
      }
      try {
        const updated0 = await updateRepairStatus(id, body);
        const updated = normalizeLoadedRepair(updated0);
        setRepair(updated);
        setField("status", updated.status || "مرفوض");
        setField("deliveryDate", updated.deliveryDate || "");
      } catch (e) {
        alert(e?.response?.data?.message || "فشل تغيير الحالة");
      }
      return;
    }

    // أي حالة أخرى
    const body = { status: value };
    if (!canEditAll && isAssigned) {
      const password = window.prompt("ادخل كلمة السر لتأكيد تغيير الحالة");
      if (!password) return;
      body.password = password;
    }
    try {
      const updated0 = await updateRepairStatus(id, body);
      const updated = normalizeLoadedRepair(updated0);
      setRepair(updated);
      setField("status", updated.status || value);
      setField("deliveryDate", updated.deliveryDate || "");

      // ✅ عند الانتقال إلى "مكتمل": طبق منطق الضمان
      if (value === "مكتمل") {
        const hasW = updated?.hasWarranty === true;
        const hasDate = !!updated?.warrantyEnd;
        if (hasW && !hasDate) setShowWarrantyModal(true);
        else if (hasW && hasDate) setAfterCompleteOpen(true);
        // لو مفيش ضمان → لا شيء
      }
    } catch (e) {
      alert(e?.response?.data?.message || "فشل تغيير الحالة");
    }
  }

  async function changeRejectedLocation(loc) {
    try {
      const body = { status: "مرفوض", rejectedDeviceLocation: loc };
      if (!canEditAll && isAssigned) {
        const password = window.prompt("ادخل كلمة السر لتأكيد تغيير مكان الجهاز");
        if (!password) return;
        body.password = password;
      }
      const updated0 = await updateRepairStatus(id, body);
      const updated = normalizeLoadedRepair(updated0);
      setRepair(updated);
      setField("rejectedDeviceLocation", updated.rejectedDeviceLocation || loc);
      setField("deliveryDate", updated.deliveryDate || "");
    } catch (e) {
      alert(e?.response?.data?.message || "فشل تحديث مكان الجهاز");
    }
  }

  async function submitDelivery(payload) {
    try {
      const parts = (payload.parts || []).map((p) => ({
        name: p.name || "",
        cost: p.cost ? Number(p.cost) : 0,
        supplier: p.supplier || undefined,
        source: p.source || undefined,
        purchaseDate: p.purchaseDate ? new Date(p.purchaseDate).toISOString() : undefined,
      }));

      // دعم تعديل السعر النهائي + السعر المبدئي من مودال التسليم إن وُجد
      let body = {
        status: "تم التسليم",
        parts,
        ...(payload.password ? { password: payload.password } : {}),
      };
      body = includeNumberField(body, "finalPrice", payload.finalPrice);
      body = includeNumberField(body, "price", payload.price);

      const updated0 = await updateRepair(id, body);
      const updated = normalizeLoadedRepair(updated0);

      setDeliverOpen(false);
      setRepair(updated);
      setField("status", updated.status || "تم التسليم");
      setField("finalPrice", updated.finalPrice ?? body.finalPrice ?? "");
      setField("price", updated.price ?? body.price ?? form.price);
      setField("deliveryDate", updated.deliveryDate || new Date().toISOString());
      setField(
        "parts",
        (updated.parts || []).map((p) => ({
          name: p.name || "",
          cost: p.cost ?? "",
          supplier: p.supplier || "",
          source: p.source || "",
          purchaseDate: p.purchaseDate ? new Date(p.purchaseDate).toISOString().slice(0, 10) : "",
        }))
      );

      // ✅ منطق الضمان عند التسليم
      if (updated?.hasWarranty === true && !updated?.warrantyEnd) {
        setShowWarrantyModal(true);
      } else if (updated?.hasWarranty === true && updated?.warrantyEnd) {
        setAfterCompleteOpen(true);
      }
      // لا ضمان → لا شيء
    } catch (e) {
      alert(e?.response?.data?.message || "خطأ أثناء إتمام التسليم");
    }
  }

  if (loading) return <div>جارِ التحميل...</div>;

  return (
    <div className="space-y-4 md:space-y-6 repair-edit-page">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">تعديل صيانة</h1>
        <Link to={`/repairs/${id}`} className="px-3 py-2 rounded-xl bg-gray-200 dark:bg-gray-700">
          عودة للتفاصيل
        </Link>
      </header>

      {/* تغيير الحالة */}
      <section className="p-3 rounded-xl bg-white dark:bg-gray-800">
        <div className="grid md:grid-cols-3 gap-3 items-end">
          <div>
            <div className="text-sm opacity-80 mb-1">الحالة</div>
            <StatusSelect value={form.status} onChange={(v) => onStatusChange(v)} disabled={!canEditAll && !isAssigned} />
            {!canEditAll && isAssigned && (
              <div className="text-xs opacity-70 mt-1">عند اختيار “تم التسليم” سيُطلب كلمة السر.</div>
            )}

            {/* خانة مكان الجهاز تظهر فقط عند الرفض */}
            {form.status === "مرفوض" && (
              <div className="mt-2">
                <div className="text-sm opacity-80 mb-1">مكان الجهاز عند الرفض</div>
                <select
                  value={form.rejectedDeviceLocation || "بالمحل"}
                  onChange={(e) => changeRejectedLocation(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200"
                  disabled={!canEditAll && !isAssigned}
                >
                  <option value="بالمحل">بالمحل</option>
                  <option value="مع العميل">مع العميل</option>
                </select>
                <div className="text-xs opacity-70 mt-1">اختيار "مع العميل" يسجّل وقت التسليم تلقائيًا.</div>
              </div>
            )}
          </div>

          <Info label="تاريخ الإنشاء" value={formatDate(form.createdAt)} />
          <Info label="تاريخ التسليم" value={form.deliveryDate ? formatDate(form.deliveryDate) : "—"} />
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
          <select value={form.technician} onChange={(e) => setField("technician", e.target.value)} className="inp w-full" disabled={!canEditAll}>
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

      {/* خيار الضمان */}
      <div className="p-3 rounded-xl bg-white dark:bg-gray-800">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={hasWarranty} onChange={(e) => setHasWarranty(e.target.checked)} />
          <span>الصيانة تحت ضمان</span>
        </label>
      </div>

      {hasWarranty && (
        <div className="grid grid-cols-1 gap-3 p-3 rounded-xl bg-white dark:bg-gray-800">
          <>
            <label className="text-sm">تاريخ انتهاء الضمان</label>
            <input type="date" className="border p-2 rounded-xl" value={warrantyEnd} onChange={(e) => setWarrantyEnd(e.target.value)} />
            <label className="text-sm">ملاحظات الضمان</label>
            <textarea className="border p-2 rounded-xl" value={warrantyNotes} onChange={(e) => setWarrantyNotes(e.target.value)} />
          </>
        </div>
      )}

      {/* قطع الغيار */}
      <section className="p-3 rounded-xl bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">قطع الغيار</h2>
          {canEditAll && (
            <button onClick={addPart} className="px-3 py-1 rounded-lg bg-gray-200 dark:bg-gray-700">
              إضافة قطعة
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
                  <tr key={i} className="odd:bg-gray-50 dark:odd:bg-gray-700/40">
                    <td className="p-2">
                      <input value={p.name} onChange={(e) => updatePart(i, "name", e.target.value)} className="inp" disabled={!canEditAll} />
                    </td>
                    <td className="p-2">
                      <input type="number" value={p.cost} onChange={(e) => updatePart(i, "cost", e.target.value)} className="inp w-28" disabled={!canEditAll} />
                    </td>
                    <td className="p-2">
                      <input value={p.supplier} onChange={(e) => updatePart(i, "supplier", e.target.value)} className="inp" disabled={!canEditAll} />
                    </td>
                    <td className="p-2">
                      <input value={p.source} onChange={(e) => updatePart(i, "source", e.target.value)} className="inp" disabled={!canEditAll} />
                    </td>
                    <td className="p-2">
                      <input type="date" value={p.purchaseDate || ""} onChange={(e) => updatePart(i, "purchaseDate", e.target.value)} className="inp" disabled={!canEditAll} />
                    </td>
                    {canEditAll && (
                      <td className="p-2">
                        <button onClick={() => removePart(i)} className="px-2 py-1 rounded-lg bg-red-500 text-white">
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
        <button onClick={submitGeneral} disabled={saving || !canEditAll} className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:opacity-90 disabled:opacity-50">
          {saving ? "جارِ الحفظ..." : "حفظ التعديلات"}
        </button>
        {!canEditAll && <span className="text-sm opacity-70">يمكنك تغيير الحالة فقط عبر القائمة بالأعلى.</span>}
      </div>

      {/* مودال التسليم */}
      <DeliveryModal
        open={deliverOpen}
        onClose={() => setDeliverOpen(false)}
        onSubmit={submitDelivery}
        initialFinalPrice={form.finalPrice || form.price || 0}
        initialParts={form.parts || []}
        requirePassword={requirePassword}
      />

      {/* مودال تاريخ الضمان */}
      {showWarrantyModal && (
        <div className="fixed inset-0 grid place-items-center bg-black/40 z-50">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl w-[380px] space-y-3">
            <h3 className="text-lg font-semibold">حدد تاريخ انتهاء الضمان</h3>
            <input type="date" className="border p-2 w-full rounded-xl" value={warrantyEnd} onChange={(e) => setWarrantyEnd(e.target.value)} />
            <div className="flex justify-end gap-2">
              <button className="px-3 py-2 rounded-xl border" onClick={() => setShowWarrantyModal(false)}>
                إلغاء
              </button>
              <button
                className="px-3 py-2 rounded-xl bg-blue-600 text-white"
                onClick={async () => {
                  if (!warrantyEnd) return;
                  await setWarranty(repair._id, { hasWarranty: true, warrantyEnd });
                  setShowWarrantyModal(false);
                  const r0 = await getRepair(id);
                  const r = normalizeLoadedRepair(r0);
                  setRepair(r);
                  // لو الحالة بالفعل مكتمل/تم التسليم بعد تحديد الضمان، افتح مودال الإجراءات
                  if (["مكتمل", "تم التسليم"].includes(r?.status)) {
                    setAfterCompleteOpen(true);
                  }
                }}
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال ما بعد الإكمال/التسليم */}
      {afterCompleteOpen && (
        <AfterCompleteModal
          open={afterCompleteOpen}
          onClose={() => setAfterCompleteOpen(false)}
          onPrint={() => window.dispatchEvent(new CustomEvent("repairs:print-current"))}
          onWhatsApp={() => window.dispatchEvent(new CustomEvent("repairs:whatsapp-current"))}
          hasWarranty={!!(repair?.hasWarranty && repair?.warrantyEnd)}
        />
      )}

      <style>{`.inp{padding:.5rem .75rem;border-radius:.75rem;background:var(--inp-bg,#f3f4f6);}`}</style>
    </div>
  );
}

function AfterCompleteModal({ open, onClose, onPrint, onWhatsApp, hasWarranty }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/40">
      <div className="bg-white dark:bg-gray-800 w-[420px] max-w-[92vw] rounded-2xl p-4 space-y-3 shadow-xl">
        <h3 className="text-lg font-semibold">تم إنهاء العملية</h3>
        <p className="text-sm opacity-80">
          {hasWarranty ? "هل تودّ طباعة إيصال الضمان أو مراسلة العميل على واتساب؟" : "هل تودّ مراسلة العميل على واتساب؟"}
        </p>
        <div className={`grid ${hasWarranty ? "sm:grid-cols-2" : "sm:grid-cols-1"} gap-2`}>
          {hasWarranty && (
            <button className="px-3 py-2 rounded-xl bg-emerald-600 text-white" onClick={() => onPrint?.()}>
              طباعة إيصال الضمان
            </button>
          )}
          <button className="px-3 py-2 rounded-xl bg-green-600 text-white" onClick={() => onWhatsApp?.()}>
            إرسال رسالة واتساب
          </button>
        </div>
        <div className="flex justify-end">
          <button className="px-3 py-2 rounded-xl border" onClick={onClose}>
            إغلاق
          </button>
        </div>
      </div>
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
