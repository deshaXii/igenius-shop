export const SHORT_STATUS = ["مكتمل", "تم التسليم", "مرفوض"];
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
  status_change: "تغيير حالة",
  assign_technician: "تعيين فنّي",
  flow_complete: "اكتمال خطوة",
  move_next: "نقل إلى قسم",
  delete: "حذف",
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
