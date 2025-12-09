import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import API, { RepairsAPI } from "../../lib/api";
import {
  getRepair,
  updateRepair,
  updateRepairStatus,
  setWarranty,
} from "./repairsApi";
import useAuthStore from "../auth/authStore";
import DeliveryModal from "../../components/DeliveryModal";
import InventoryItemSelect from "../../components/parts/InventoryItemSelect";
import SupplierSelect from "../../components/parts/SupplierSelect";
import VoiceInput from "../../components/VoiceInput";
import AfterCompleteModal from "../../components/AfterCompleteModal";
import { PALETTE } from "../../utils/ui";
import toNum from "../../components/helpers/toNum";
import { SHORT_STATUS } from "../../utils/data";

function normalizeLoadedRepair(r) {
  return {
    ...r,
    price: toNum(r.price) ?? r.price,
    finalPrice: toNum(r.finalPrice) ?? r.finalPrice,
  };
}
function includeNumberField(obj, key, val) {
  if (val === "" || val === null || val === undefined) return obj;
  const n = Number(val);
  return Number.isFinite(n) ? { ...obj, [key]: n } : obj;
}

export default function EditRepairPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin" || user?.permissions?.adminOverride;
  const canEditAll = isAdmin || user?.permissions?.editRepair;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deps, setDeps] = useState([]);
  const [techs, setTechs] = useState([]);
  const [timeline, setTimeline] = useState({
    currentDepartment: null,
    flows: [],
  });
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [requirePassword, setRequirePassword] = useState(false);
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
    rejectedDeviceLocation: "",
    currentDepartment: "",
  });
  const [hasWarranty, setHasWarranty] = useState(false);
  const [warrantyNotes, setWarrantyNotes] = useState("");
  const [warrantyEnd, setWarrantyEnd] = useState("");
  const [afterCompleteOpen, setAfterCompleteOpen] = useState(false);
  const [showWarrantyModal, setShowWarrantyModal] = useState(false);

  const isAssigned = useMemo(() => {
    if (!repair) return false;
    const techId = repair?.technician?._id || repair?.technician;
    const uid = user?.id || user?._id;
    return techId && uid && String(techId) === String(uid);
  }, [repair, user]);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadAll() {
    setLoading(true);
    try {
      const [r0, d, tl] = await Promise.all([
        getRepair(id),
        API.get("/departments").then((r) => r.data || []),
        RepairsAPI.timeline(id),
      ]);
      const r = normalizeLoadedRepair(r0);
      setRepair(r);
      setDeps(d);
      setTimeline(tl);

      if (tl?.currentDepartment?._id) {
        const ts = await API.get(
          `/technicians?department=${tl.currentDepartment._id}`
        ).then((r) => r.data || []);
        setTechs(ts);
      } else setTechs([]);

      const mappedParts = (r.parts || []).map((p) => ({
        itemId: p.itemId || "",
        itemName: p.itemName || "",
        supplierId: p.supplierId || "",
        paid: !!p.paid,
        name: p.name || "",
        cost: p.cost ?? "",
        supplier: p.supplier || "",
        source: p.source || "",
        purchaseDate: p.purchaseDate
          ? new Date(p.purchaseDate).toISOString().slice(0, 10)
          : "",
      }));

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
        parts: mappedParts,
        status: r.status || "",
        createdAt: r.createdAt || "",
        deliveryDate: r.deliveryDate || "",
        rejectedDeviceLocation: r.rejectedDeviceLocation || "",
        currentDepartment:
          r.currentDepartment?._id || r.currentDepartment || "",
      });
      setHasWarranty(!!r.hasWarranty);
      setWarrantyEnd(r.warrantyEnd ? String(r.warrantyEnd).slice(0, 10) : "");
      setWarrantyNotes(r.warrantyNotes || "");
    } catch (e) {
      console.error(e);
      alert("تعذّر تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }

  async function onPickDepartment(deptId) {
    setForm((p) => ({ ...p, currentDepartment: deptId, technician: "" }));
    if (deptId) {
      try {
        const ts = await API.get(`/technicians?department=${deptId}`).then(
          (r) => r.data || []
        );
        setTechs(ts);
      } catch {
        setTechs([]);
      }
    } else setTechs([]);
  }

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

  async function submitGeneral() {
    if (!canEditAll) {
      alert("ليست لديك صلاحية تعديل كاملة. يمكنك تغيير الحالة فقط.");
      return;
    }
    setSaving(true);
    try {
      if (
        timeline?.currentDepartment?._id &&
        form.currentDepartment &&
        String(form.currentDepartment) !==
          String(timeline.currentDepartment._id)
      ) {
        const cur = timeline.flows?.length
          ? timeline.flows[timeline.flows.length - 1]
          : null;
        if (cur && cur.status !== "completed") {
          await RepairsAPI.completeStep(id, {
            price: 0,
            notes: "اكتمال تلقائي أثناء نقل القسم من شاشة التعديل",
          });
        }
        await RepairsAPI.moveNext(id, { departmentId: form.currentDepartment });
      }

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
          cost:
            p.cost === "" || p.cost === null || p.cost === undefined
              ? 0
              : Number(p.cost),
          supplier: p.supplier || undefined,
          source: p.source || undefined,
          purchaseDate: p.purchaseDate
            ? new Date(p.purchaseDate).toISOString()
            : undefined,
        })),
        hasWarranty,
        ...(warrantyEnd ? { warrantyEnd } : {}),
        ...(warrantyNotes ? { warrantyNotes } : {}),
      };
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

      if (value === "مكتمل") {
        const hasW = updated?.hasWarranty === true;
        const hasDate = !!updated?.warrantyEnd;
        if (hasW && !hasDate) setShowWarrantyModal(true);
        else if (hasW && hasDate) setAfterCompleteOpen(true);
      }
    } catch (e) {
      alert(e?.response?.data?.message || "فشل تغيير الحالة");
    }
  }

  async function submitDelivery(payload) {
    try {
      const parts = (payload.parts || []).map((p) => ({
        name: p.name || "",
        cost: p.cost ? Number(p.cost) : 0,
        supplier: p.supplier || undefined,
        source: p.source || undefined,
        purchaseDate: p.purchaseDate
          ? new Date(p.purchaseDate).toISOString()
          : undefined,
      }));

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
      setField(
        "deliveryDate",
        updated.deliveryDate || new Date().toISOString()
      );
      setField(
        "parts",
        (updated.parts || []).map((p) => ({
          itemId: p.itemId || "",
          itemName: p.itemName || "",
          supplierId: p.supplierId || "",
          paid: !!p.paid,
          name: p.name || "",
          cost: p.cost ?? "",
          supplier: p.supplier || "",
          source: p.source || "",
          purchaseDate: p.purchaseDate
            ? new Date(p.purchaseDate).toISOString().slice(0, 10)
            : "",
        }))
      );

      if (updated?.hasWarranty === true && !updated?.warrantyEnd) {
        setShowWarrantyModal(true);
      } else if (updated?.hasWarranty === true && updated?.warrantyEnd) {
        setAfterCompleteOpen(true);
      }
    } catch (e) {
      alert(e?.response?.data?.message || "خطأ أثناء إتمام التسليم");
    }
  }

  if (loading)
    return (
      <div className="min-h-[40vh] grid place-items-center text-sm text-[16px] opacity-70">
        جارِ التحميل...
      </div>
    );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24">
      {/* ===== Header Gradient ===== */}
      <div className="rounded-3xl overflow-hidden shadow-sm">
        <div className="bg-gradient-to-l from-fuchsia-600 via-violet-600 to-indigo-700 text-white p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <span>تعديل صيانة</span>
                {repair?.repairId && (
                  <span className="text-sm text-[16px] md:text-base px-2 py-0.5 rounded-full bg-black/20 border border-white/20">
                    #{repair.repairId}
                  </span>
                )}
              </h1>
              <p className="opacity-90 mt-1 text-sm text-[16px] md:text-base">
                غيّر البيانات ووزّع القطع ثم احفظ التعديلات.
              </p>

              {repair && (
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] md:text-xs">
                  <span className="px-2 py-1 rounded-full bg-white/10 border border-white/20">
                    العميل:{" "}
                    <span className="font-semibold">
                      {repair.customerName || "—"}
                    </span>
                  </span>
                  <span className="px-2 py-1 rounded-full bg-white/10 border border-white/20">
                    الجهاز:{" "}
                    <span className="font-semibold">
                      {repair.deviceType || "—"}
                    </span>
                  </span>
                  <span className="px-2 py-1 rounded-full bg-white/10 border border-white/20">
                    الحالة الحالية:{" "}
                    <span className="font-semibold">
                      {repair.status || "غير محددة"}
                    </span>
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/repairs/${id}`}
                className="px-3 py-2 rounded-xl bg-white/90 text-indigo-700 hover:opacity-90 shadow-sm text-sm"
              >
                عودة للتفاصيل
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ===== الحالة + التواريخ ===== */}
      <section className={`p-4 md:p-5 rounded-2xl ${PALETTE.card}`}>
        <div className="grid md:grid-cols-3 gap-3 items-end">
          <div>
            <div className="text-sm text-[16px] opacity-80 mb-1">الحالة</div>
            <select
              value={form.status}
              onChange={(e) => onStatusChange(e.target.value)}
              disabled={!canEditAll && !isAssigned}
              className="inp w-full"
            >
              <option value="">اختر حالة</option>
              {SHORT_STATUS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {!canEditAll && isAssigned && (
              <div className="text-xs opacity-70 mt-1">
                عند اختيار “تم التسليم” سيُطلب كلمة السر.
              </div>
            )}
            {form.status === "مرفوض" && (
              <div className="mt-2 space-y-1">
                <div className="text-sm text-[16px] opacity-80">
                  مكان الجهاز عند الرفض
                </div>
                <select
                  value={form.rejectedDeviceLocation || "بالمحل"}
                  onChange={(e) =>
                    setField("rejectedDeviceLocation", e.target.value)
                  }
                  className="inp bg-red-50/80 dark:bg-red-900/20 text-red-800 dark:text-red-200"
                  disabled={!canEditAll && !isAssigned}
                >
                  <option value="بالمحل">بالمحل</option>
                  <option value="مع العميل">مع العميل</option>
                </select>
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

      {/* ===== توجيه (قسم/فنّي) ===== */}
      <section className={`p-4 md:p-5 rounded-2xl ${PALETTE.card}`}>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-indigo-500" />
          <span>التوجيه</span>
        </h2>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="القسم الحالي">
            <select
              className="inp w-full"
              value={form.currentDepartment || ""}
              onChange={(e) => onPickDepartment(e.target.value)}
              disabled={!canEditAll}
            >
              <option value="">—</option>
              {deps.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="الفنّي (من داخل القسم)">
            <select
              className="inp w-full"
              value={form.technician}
              onChange={(e) => setField("technician", e.target.value)}
              disabled={!canEditAll}
            >
              <option value="">—</option>
              {techs.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name || t.username || t.email}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      {/* ===== معلومات العميل/الجهاز ===== */}
      <section className={`p-4 md:p-5 rounded-2xl ${PALETTE.card}`}>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-indigo-500" />
          <span>البيانات العامة</span>
        </h2>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="اسم العميل">
            <input
              className="inp w-full"
              value={form.customerName}
              disabled={!canEditAll}
              onChange={(e) => setField("customerName", e.target.value)}
            />
          </Field>
          <Field label="هاتف">
            <input
              className="inp w-full"
              value={form.phone}
              disabled={!canEditAll}
              onChange={(e) => setField("phone", e.target.value)}
            />
          </Field>
          <Field label="نوع الجهاز">
            <input
              className="inp w-full"
              value={form.deviceType}
              disabled={!canEditAll}
              onChange={(e) => setField("deviceType", e.target.value)}
            />
          </Field>
          <Field label="اللون">
            <input
              className="inp w-full"
              value={form.color}
              disabled={!canEditAll}
              onChange={(e) => setField("color", e.target.value)}
            />
          </Field>
          <Field label="العطل">
            <input
              className="inp w-full"
              value={form.issue}
              disabled={!canEditAll}
              onChange={(e) => setField("issue", e.target.value)}
            />
          </Field>
          <Field label="السعر المتفق عليه">
            <input
              className="inp w-full"
              type="number"
              value={form.price}
              disabled={!canEditAll}
              onChange={(e) => setField("price", e.target.value)}
            />
          </Field>
          <Field label="السعر النهائي">
            <input
              className="inp w-full"
              type="number"
              value={form.finalPrice}
              disabled={!canEditAll}
              onChange={(e) => setField("finalPrice", e.target.value)}
            />
          </Field>
          <Field label="ملاحظات">
            <input
              className="inp w-full"
              value={form.notes}
              disabled={!canEditAll}
              onChange={(e) => setField("notes", e.target.value)}
            />
          </Field>
        </div>
      </section>

      {/* ===== الضمان ===== */}
      <section className={`p-4 md:p-5 rounded-2xl ${PALETTE.card}`}>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={hasWarranty}
            onChange={(e) => setHasWarranty(e.target.checked)}
            disabled={!canEditAll}
          />
          <span>الصيانة تحت ضمان</span>
        </label>
        {hasWarranty && (
          <div className="grid md:grid-cols-2 gap-3 mt-3">
            <div>
              <div className="text-sm text-[16px] mb-1">
                تاريخ انتهاء الضمان
              </div>
              <input
                type="date"
                className="inp w-full"
                value={warrantyEnd}
                onChange={(e) => setWarrantyEnd(e.target.value)}
                disabled={!canEditAll}
              />
            </div>
            <div className="md:col-span-2">
              <div className="text-sm text-[16px] mb-1">ملاحظات الضمان</div>
              <textarea
                className="inp w-full min-h-[80px]"
                rows={3}
                value={warrantyNotes}
                onChange={(e) => setWarrantyNotes(e.target.value)}
                disabled={!canEditAll}
              />
            </div>
          </div>
        )}
      </section>

      {/* ===== قطع الغيار ===== */}
      <section className={`p-4 md:p-5 rounded-2xl ${PALETTE.card}`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-indigo-500" />
            <span>قطع الغيار</span>
          </h2>
          {canEditAll && (
            <button
              onClick={addPart}
              className={`px-3 py-1.5 rounded-xl text-sm text-[16px] ${PALETTE.outline}`}
            >
              + إضافة قطعة
            </button>
          )}
        </div>

        {form.parts.length === 0 ? (
          <div className="opacity-70 text-sm">لا توجد قطع</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {form.parts.map((p, i) => (
              <div
                key={i}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/80 shadow-[0_6px_14px_rgba(15,23,42,0.04)]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-100">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    <span>قطعة #{i + 1}</span>
                  </div>
                  {canEditAll && (
                    <button
                      onClick={() => removePart(i)}
                      className={`px-2 py-1 rounded-lg text-xs ${PALETTE.danger}`}
                    >
                      حذف
                    </button>
                  )}
                </div>

                <div className="grid gap-2">
                  <div>
                    <div className="text-xs opacity-70 mb-1">
                      الصنف (من المخزن)
                    </div>
                    <InventoryItemSelect
                      value={p.itemId || ""}
                      onChange={(id, obj) => {
                        updatePart(i, "itemId", id);
                        updatePart(i, "itemName", obj?.name || "");
                        if (!p.name && obj?.name)
                          updatePart(i, "name", obj.name);
                        if (
                          (p.cost === "" || p.cost == null) &&
                          typeof obj?.unitCost === "number"
                        ) {
                          updatePart(i, "cost", obj.unitCost);
                        }
                      }}
                      disabled={!canEditAll}
                    />
                  </div>

                  <TwoCols>
                    <MiniField label="اسم القطعة">
                      <InputWithVoice
                        value={p.name}
                        onChangeValue={(v) => updatePart(i, "name", v)}
                        disabled={!canEditAll}
                        placeholder="اسم القطعة"
                      />
                    </MiniField>
                    <MiniField label="التكلفة">
                      <input
                        type="number"
                        value={p.cost}
                        onChange={(e) => updatePart(i, "cost", e.target.value)}
                        className="inp w-full"
                        disabled={!canEditAll}
                      />
                    </MiniField>
                  </TwoCols>

                  <div>
                    <div className="text-xs opacity-70 mb-1">المورد</div>
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
                      disabled={!canEditAll}
                    />
                  </div>

                  <TwoCols>
                    <MiniField label="بواسطة">
                      <InputWithVoice
                        value={p.source}
                        onChangeValue={(v) => updatePart(i, "source", v)}
                        disabled={!canEditAll}
                        placeholder="بواسطة"
                      />
                    </MiniField>
                    <MiniField label="تاريخ الشراء">
                      <input
                        type="date"
                        value={p.purchaseDate || ""}
                        onChange={(e) =>
                          updatePart(i, "purchaseDate", e.target.value)
                        }
                        className="inp w-full"
                        disabled={!canEditAll}
                      />
                    </MiniField>
                  </TwoCols>

                  <label className="flex items-center gap-2 text-xs mt-1">
                    <input
                      type="checkbox"
                      checked={!!p.paid}
                      onChange={(e) => updatePart(i, "paid", e.target.checked)}
                      disabled={!canEditAll}
                    />
                    <span>مدفوعة؟</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Desktop Save */}
      <div className="hidden sm:flex items-center gap-2">
        <button
          onClick={submitGeneral}
          disabled={saving || !canEditAll}
          className={`px-5 py-2.5 rounded-xl ${PALETTE.primary} disabled:opacity-50 shadow-sm`}
        >
          {saving ? "جارِ الحفظ..." : "حفظ التعديلات"}
        </button>
        {!canEditAll && (
          <span className="text-sm text-[16px] opacity-70">
            يمكنك تغيير الحالة فقط من أعلى الصفحة.
          </span>
        )}
      </div>

      {/* Mobile sticky save */}
      <div className="sm:hidden h-16" />
      <div className="sm:hidden fixed inset-x-0 bottom-0 z-40">
        <div className="mx-3 mb-3 p-2 rounded-2xl shadow-lg flex items-center gap-2 justify-between bg-white dark:bg-gray-900 border border-slate-200 dark:border-slate-800">
          <div className="text-xs opacity-70 truncate">
            {form.customerName || "— عميل —"} • {form.deviceType || "— جهاز —"}
          </div>
          <button
            onClick={submitGeneral}
            disabled={saving || !canEditAll}
            className={`px-4 py-2 rounded-xl ${PALETTE.primary} disabled:opacity-50`}
          >
            {saving ? "جارِ الحفظ..." : "حفظ"}
          </button>
        </div>
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
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl w-[380px] space-y-3 shadow-xl">
            <h3 className="text-lg font-semibold">حدد تاريخ انتهاء الضمان</h3>
            <input
              type="date"
              className="inp w-full"
              value={warrantyEnd}
              onChange={(e) => setWarrantyEnd(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-2 rounded-xl border"
                onClick={() => setShowWarrantyModal(false)}
              >
                إلغاء
              </button>
              <button
                className={`px-3 py-2 rounded-xl ${PALETTE.primary}`}
                onClick={async () => {
                  if (!warrantyEnd) return;
                  await setWarranty(repair._id, {
                    hasWarranty: true,
                    warrantyEnd,
                  });
                  setShowWarrantyModal(false);
                  const r0 = await getRepair(id);
                  const r = normalizeLoadedRepair(r0);
                  setRepair(r);
                  if (["مكتمل", "تم التسليم"].includes(r?.status))
                    setAfterCompleteOpen(true);
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
          onPrint={() =>
            window.dispatchEvent(new CustomEvent("repairs:print-current"))
          }
          onWhatsApp={() =>
            window.dispatchEvent(new CustomEvent("repairs:whatsapp-current"))
          }
          hasWarranty={!!(repair?.hasWarranty && repair?.warrantyEnd)}
        />
      )}

      <style>{`
        .inp{
          padding:.6rem .8rem;
          border-radius:.9rem;
          background:var(--inp-bg,#f3f4f6);
          border:1px solid rgba(148,163,184,.45);
          font-size:0.875rem;
          transition:
            border-color .15s ease,
            box-shadow .15s ease,
            background-color .15s ease,
            transform .05s ease;
        }
        .inp:focus{
          outline:none;
          border-color:rgb(129 140 248);
          box-shadow:0 0 0 1px rgba(129,140,248,.45);
          background:#ffffff;
          transform:translateY(-0.5px);
        }
      `}</style>
    </div>
  );
}

/* ===== عناصر مساعدة للـUI ===== */
function Field({ label, children }) {
  return (
    <label className="space-y-1 text-sm">
      <div className="text-sm text-[16px] opacity-80">{label}</div>
      {children}
    </label>
  );
}
function Info({ label, value }) {
  return (
    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 text-sm">
      <div className="text-[11px] opacity-70 mb-0.5">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("ar-EG", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return "—";
  }
}
function TwoCols({ children }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}
function MiniField({ label, children }) {
  return (
    <label className="space-y-1">
      <div className="text-xs opacity-70">{label}</div>
      {children}
    </label>
  );
}

function InputWithVoice({
  value,
  onChangeValue,
  placeholder = "",
  disabled = false,
  type = "text",
}) {
  const handleChange = (e) => {
    onChangeValue?.(e.target.value);
  };

  const handleVoiceText = (txt) => {
    if (!onChangeValue || disabled) return;
    onChangeValue(txt);
  };

  return (
    <div className="relative flex items-center">
      <input
        type={type}
        className="inp w-full pr-10"
        value={value ?? ""}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
      />
      <div
        className={`absolute left-1.5 top-1/2 -translate-y-1/2 ${
          disabled ? "pointer-events-none opacity-40" : ""
        }`}
      >
        <VoiceInput onText={handleVoiceText} />
      </div>
    </div>
  );
}
