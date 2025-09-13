import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import InputField from "../../components/InputField";
import VoiceInput from "../../components/VoiceInput";
import QrAfterCreateModal from "../../components/QrAfterCreateModal";
import API, { RepairsAPI, DepartmentsAPI } from "../../lib/api";
/* القوائم */
import InventoryItemSelect from "../../components/parts/InventoryItemSelect";
import SupplierSelect from "../../components/parts/SupplierSelect";

/* --------- ألوان/ستايل ثابت --------- */
const PALETTE = {
  card: "bg-white/90 dark:bg-[#1c273fe6] border border-slate-200 dark:border-slate-800 backdrop-blur",
  outline:
    "border border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800",
  primary:
    "bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 text-white",
};

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
    technician: "",
  });

  /* لراحة المستخدم: إظهار لمحة عميل/جهاز في الشريط السفلي */
  const footerHint = useMemo(() => {
    const a = form.customerName?.trim();
    const b = form.deviceType?.trim();
    return [a || "— عميل —", b || "— جهاز —"].join(" • ");
  }, [form.customerName, form.deviceType]);

  useEffect(() => {
    DepartmentsAPI.list()
      .then(setDeps)
      .catch(() => setDeps([]));
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
    e?.preventDefault?.();
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
        parts: form.parts.map((p) => ({
          name: p.name,
          cost: p.cost ? Number(p.cost) : 0,
          supplier: p.supplier || undefined,
          source: p.source || undefined,
          purchaseDate: p.purchaseDate
            ? new Date(p.purchaseDate).toISOString()
            : undefined,
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
      {/* ===== هيدر ملوّن ===== */}
      <div className="rounded-3xl overflow-hidden">
        <div className="bg-gradient-to-l from-fuchsia-600 via-violet-600 to-indigo-700 text-white p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">إضافة صيانة</h1>
              <p className="opacity-90 mt-1">
                أدخل بيانات العميل والجهاز وأرفق قطع الغيار (إن وجدت).
              </p>
            </div>
            <button
              onClick={addPart}
              className="px-4 py-2 rounded-xl bg-white text-indigo-700 hover:opacity-90"
            >
              + إضافة قطعة
            </button>
          </div>
        </div>
      </div>

      {/* ===== بطاقة: بيانات العميل والجهاز ===== */}
      <section className={`p-4 md:p-5 rounded-2xl ${PALETTE.card}`}>
        <h2 className="text-lg font-semibold mb-4">بيانات أساسية</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="اسم العميل">
            <div className="relative flex items-center gap-2">
              <InputField
                className="inp w-full"
                value={form.customerName}
                onChange={(e) => setField("customerName", e.target.value)}
                placeholder="ادخل اسم العميل"
                required
              />
              <VoiceInput onText={(t) => setField("customerName", t)} />
            </div>
          </Field>

          <Field label="هاتف">
            <div className="relative flex items-center gap-2">
              <InputField
                className="inp w-full"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                placeholder="ادخل رقم الهاتف"
              />
              <VoiceInput onText={(t) => setField("phone", t)} />
            </div>
          </Field>

          <Field label="نوع الجهاز">
            <div className="relative flex items-center gap-2">
              <InputField
                className="inp w-full"
                value={form.deviceType}
                onChange={(e) => setField("deviceType", e.target.value)}
                placeholder="ادخل نوع الجهاز"
                required
              />
              <VoiceInput onText={(t) => setField("deviceType", t)} />
            </div>
          </Field>

          <Field label="اللون">
            <div className="relative flex items-center gap-2">
              <InputField
                className="inp w-full"
                value={form.color}
                onChange={(e) => setField("color", e.target.value)}
                placeholder="ادخل اللون"
              />
              <VoiceInput onText={(t) => setField("color", t)} />
            </div>
          </Field>

          <Field label="العطل">
            <div className="relative flex items-center gap-2">
              <InputField
                className="inp w-full"
                value={form.issue}
                onChange={(e) => setField("issue", e.target.value)}
                placeholder="ادخل العطل"
                required
              />
              <VoiceInput onText={(t) => setField("issue", t)} />
            </div>
            <div className="mt-2">
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
            <div className="relative flex items-center gap-2">
              <InputField
                className="inp w-full"
                value={form.price}
                onChange={(e) => setField("price", e.target.value)}
                placeholder="ادخل السعر المبدئي"
              />
              <VoiceInput onText={(t) => setField("price", t)} />
            </div>
          </Field>

          <div className="md:col-span-2">
            <Field label="ملاحظات">
              <InputField
                className="inp w-full"
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="اختياري"
              />
            </Field>
          </div>
        </div>
      </section>

      {/* ===== بطاقة: التوجيه ===== */}
      <section className={`p-4 md:p-5 rounded-2xl ${PALETTE.card}`}>
        <h2 className="text-lg font-semibold mb-4">توجيه الصيانة</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block mb-1 text-sm">القسم الابتدائي</label>
            <select
              className="w-full px-3 py-2 rounded-xl border"
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
              className="w-full px-3 py-2 rounded-xl border"
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
        </div>
      </section>

      {/* ===== بطاقة: قطع الغيار ===== */}
      <section className={`p-4 md:p-5 rounded-2xl ${PALETTE.card}`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">قطع الغيار</h2>
          <button
            onClick={addPart}
            className={`px-3 py-1.5 rounded-xl ${PALETTE.outline}`}
          >
            + إضافة قطعة
          </button>
        </div>

        {form.parts.length === 0 ? (
          <div className="opacity-70">لا توجد قطع</div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-[920px] w-full text-sm">
                <thead>
                  <tr className="text-right border-b">
                    <Th>الصنف (من المخزن)</Th>
                    <Th>اسم القطعة</Th>
                    <Th>التكلفة</Th>
                    <Th>المورد</Th>
                    <Th>بواسطة</Th>
                    <Th>تاريخ الشراء</Th>
                    <Th>مدفوعة؟</Th>
                    <Th>حذف</Th>
                  </tr>
                </thead>
                <tbody>
                  {form.parts.map((p, i) => (
                    <tr key={i} className="border-b">
                      <Td className="min-w-[220px]">
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
                        />
                      </Td>
                      <Td>
                        <input
                          value={p.name}
                          onChange={(e) =>
                            updatePart(i, "name", e.target.value)
                          }
                          className="inp w-full"
                        />
                      </Td>
                      <Td>
                        <input
                          type="number"
                          value={p.cost}
                          onChange={(e) =>
                            updatePart(i, "cost", e.target.value)
                          }
                          className="inp w-28"
                        />
                      </Td>
                      <Td className="min-w-[200px]">
                        {/* ملاحظة: لو عايز تمنع اختيار المورد وتثبّته على "المحل" فقط، ممكن تخفي الـSupplierSelect وتملأ الحقل نصيًا بـ"المحل". */}
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
                      </Td>
                      <Td>
                        <input
                          value={p.source}
                          onChange={(e) =>
                            updatePart(i, "source", e.target.value)
                          }
                          className="inp w-full"
                        />
                      </Td>
                      <Td>
                        <input
                          type="date"
                          value={p.purchaseDate || ""}
                          onChange={(e) =>
                            updatePart(i, "purchaseDate", e.target.value)
                          }
                          className="inp"
                        />
                      </Td>
                      <Td className="text-center">
                        <input
                          type="checkbox"
                          checked={!!p.paid}
                          onChange={(e) =>
                            updatePart(i, "paid", e.target.checked)
                          }
                        />
                      </Td>
                      <Td>
                        <button
                          onClick={() => removePart(i)}
                          className="px-2 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
                        >
                          حذف
                        </button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden grid gap-3">
              {form.parts.map((p, i) => (
                <div
                  key={i}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">قطعة #{i + 1}</div>
                    <button
                      onClick={() => removePart(i)}
                      className="px-2 py-1 rounded-lg bg-rose-600 text-white"
                    >
                      حذف
                    </button>
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
                      />
                    </div>
                    <TwoCols>
                      <MiniField label="اسم القطعة">
                        <input
                          value={p.name}
                          onChange={(e) =>
                            updatePart(i, "name", e.target.value)
                          }
                          className="inp w-full"
                        />
                      </MiniField>
                      <MiniField label="التكلفة">
                        <input
                          type="number"
                          value={p.cost}
                          onChange={(e) =>
                            updatePart(i, "cost", e.target.value)
                          }
                          className="inp w-full"
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
                      />
                    </div>

                    <TwoCols>
                      <MiniField label="بواسطة">
                        <input
                          value={p.source}
                          onChange={(e) =>
                            updatePart(i, "source", e.target.value)
                          }
                          className="inp w-full"
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
                        />
                      </MiniField>
                    </TwoCols>

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!p.paid}
                        onChange={(e) =>
                          updatePart(i, "paid", e.target.checked)
                        }
                      />
                      <span>مدفوعة؟</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* مودال QR */}
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

      {/* زر الحفظ — Desktop */}
      <div className="hidden sm:flex items-center gap-2">
        <button
          onClick={submit}
          disabled={saving}
          className={`px-5 py-2.5 rounded-xl ${PALETTE.primary} disabled:opacity-50`}
        >
          {saving ? "جارِ الحفظ..." : "حفظ الصيانة"}
        </button>
      </div>

      {/* زر الحفظ — Mobile Sticky */}
      <div className="sm:hidden h-16" />
      <div className="sm:hidden fixed inset-x-0 bottom-0 z-40">
        <div className="mx-3 mb-3 p-2 rounded-2xl shadow-lg flex items-center gap-2 justify-between bg-white dark:bg-gray-900 border border-slate-200 dark:border-slate-800">
          <div className="text-xs opacity-70 truncate">{footerHint}</div>
          <button
            onClick={submit}
            disabled={saving}
            className={`px-4 py-2 rounded-xl ${PALETTE.primary} disabled:opacity-50`}
          >
            {saving ? "جارِ الحفظ..." : "حفظ"}
          </button>
        </div>
      </div>

      <style>{`.inp{padding:.6rem .8rem;border-radius:.9rem;background:var(--inp-bg,#f3f4f6)} .repair-parts-table th,.repair-parts-table td{vertical-align:top}`}</style>
    </div>
  );
}

/* ===== عناصر صغيرة مساعدة للـUI ===== */
function Field({ label, children }) {
  return (
    <label className="space-y-1">
      <div className="text-sm opacity-80">{label}</div>
      {children}
    </label>
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
  return <td className={`py-2 px-2 ${className}`}>{children}</td>;
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
