import { Outlet } from "react-router-dom";

const AuthLayout = () => {
  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4"
    >
      <div className="w-full max-w-5xl grid gap-10 items-center md:grid-cols-[1.1fr,0.9fr]">
        {/* جانب تعريفي بسيط للنظام – يظهر فقط على الشاشات الكبيرة */}
        <div className="hidden md:flex flex-col gap-4 text-right">
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
            IGenius Service
          </h1>
          <p className="text-sm text-[16px] text-gray-600 dark:text-gray-300 leading-relaxed">
            نظام متكامل لإدارة محلات صيانة الموبايلات:
            <br />
            استقبال الأجهزة – متابعة الفنيين – إدارة الحسابات – المخزن – التذاكر
            – كل ده من شاشة واحدة.
          </p>
          <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <li>• متابعة حالة كل جهاز لحظيًا</li>
            <li>• تقارير مالية مختصرة وواضحة</li>
            <li>• دعم الوضع الداكن وواجهة عربية بالكامل</li>
          </ul>
        </div>

        {/* كارت تسجيل الدخول الفعلي */}
        <div className="w-full">
          <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white/90 dark:bg-gray-950/90 shadow-xl p-6 sm:p-8">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
