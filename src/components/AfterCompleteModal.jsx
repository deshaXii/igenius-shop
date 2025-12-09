import { UI } from "../utils/ui";

// ======== AfterCompleteModal ========
export default function AfterCompleteModal({
  open,
  onClose,
  onPrint,
  onWhatsApp,
  hasWarranty,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/40">
      <div className="bg-white dark:bg-gray-800 w-[420px] max-w-[92vw] rounded-2xl p-4 space-y-3 shadow-xl">
        <h3 className="text-lg font-semibold">تم إنهاء العملية</h3>
        <p className="text-sm text-[16px] opacity-80">
          هل تودّ طباعة إيصال الضمان أو مراسلة العميل على واتساب؟
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          <button
            className={`${UI.btn} bg-emerald-600 hover:bg-emerald-700 text-white`}
            onClick={() => onPrint?.()}
          >
            طباعة إيصال الضمان
          </button>
          <button
            className={`${UI.btn} bg-green-600 hover:bg-green-700 text-white`}
            onClick={() => onWhatsApp?.()}
          >
            إرسال رسالة واتساب
          </button>
        </div>
        <div className="flex justify-end">
          <button className={`${UI.btn} ${UI.btnGhost}`} onClick={onClose}>
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
