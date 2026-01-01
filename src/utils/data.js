export const SHORT_STATUS = [
  "في الانتظار",
  "جاري العمل",
  "مكتمل",
  "تم التسليم",
  "مرتجع",
  "مرفوض في المحل",
  "مرفوض مع العميل",
];
export const SHOP = {
  name: "IGenius",
  phone: "01000000000",
  address: "القاهرة — شارع المثال، عمارة 10",
  footer: "شكراً لاختياركم خدماتنا.",
  warrantyNote:
    "الضمان يشمل العطل المُصلّح فقط ولا يشمل سوء الاستخدام أو الكسر أو السوائل.",
};

export const STATUS_AR = {
  waiting: "في الانتظار",
  in_progress: "جاري العمل",
  completed: "مكتمل",
};

/* ==== سجلّ الحركات بصياغة ودّية ==== */
export const TYPE_AR = {
  create: "إنشاء",
  update: "تعديل",
  delete: "حذف",
  assign_department: "تعيين قسم",
  assign_technician: "تعيين فنّي",
  flow_start: "بدء خطوة",
  flow_complete: "إكمال خطوة",
  move_next: "نقل للقسم التالي",
  status_change: "تغيير حالة",
  price_set: "تسعير",
};

export const STATUS_AR_FULL = {
  waiting: "في الانتظار",
  in_progress: "جاري العمل",
  completed: "مكتمل",
  "في الانتظار": "في الانتظار",
  "جاري العمل": "جاري العمل",
  مكتمل: "مكتمل",
  "تم التسليم": "تم التسليم",
  مرفوض: "مرفوض",
  مرتجع: "مرتجع",
};

export function friendlyField(key = "") {
  const map = {
    status: "الحالة",
    price: "السعر",
    finalPrice: "السعر النهائي",
    color: "اللون",
    deviceType: "نوع الجهاز",
    issue: "العطل",
    technician: "الفني",
    deliveryDate: "تاريخ التسليم",
    returnDate: "تاريخ المرتجع",
    rejectedDeviceLocation: "مكان الجهاز (مرفوض)",
    parts: "قطع الغيار",
    notes: "ملاحظات",
    phone: "الهاتف",
    customerName: "اسم العميل",
  };
  return map[key] || key;
}
export function displayRepairStatus(repairOrStatus, rejectedDeviceLocation) {
  const isObj = repairOrStatus && typeof repairOrStatus === "object";
  const status = isObj ? repairOrStatus.status : repairOrStatus;
  const loc = isObj ? repairOrStatus.rejectedDeviceLocation : rejectedDeviceLocation;

  if (!status) return "";

  if (status === "مرفوض") {
    return loc === "مع العميل" ? "مرفوض مع العميل" : "مرفوض في المحل";
  }
  return status;
}

/** قيمة الـ select الحالية حسب بيانات الريباير */
export function statusToSelectValue(repair) {
  return displayRepairStatus(repair);
}

/**
 * ✅ تحويل اختيار الـ UI إلى Patch للـ API
 * - "مرفوض في المحل" => { status:"مرفوض", rejectedDeviceLocation:"بالمحل" }
 * - "مرفوض مع العميل" => { status:"مرفوض", rejectedDeviceLocation:"مع العميل" }
 */
export function selectValueToStatusPatch(value) {
  const v = String(value || "").trim();
  if (v === "مرفوض في المحل") return { status: "مرفوض", rejectedDeviceLocation: "بالمحل" };
  if (v === "مرفوض مع العميل") return { status: "مرفوض", rejectedDeviceLocation: "مع العميل" };
  return { status: v };
}