// src/components/StatusSelect.jsx
import statusOptions from "../utils/statusOptions";

function emojiFor(s) {
  switch (s) {
    case "في الانتظار":
      return "🟡";
    case "جاري العمل":
      return "🟢";
    case "مكتمل":
      return "🔵";
    case "تم التسليم":
      return "🔷";
    case "مرفوض":
      return "🔴";
    case "مرتجع":
      return "🟣";
    default:
      return "⚪";
  }
}

function colorClasses(s) {
  switch (s) {
    case "في الانتظار":
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "جاري العمل":
      return "bg-emerald-100 text-emerald-800 border-emerald-300";
    case "مكتمل":
      return "bg-sky-100 text-sky-800 border-sky-300";
    case "تم التسليم":
      return "bg-blue-100 text-blue-800 border-blue-300";
    case "مرفوض":
      return "bg-rose-100 text-rose-800 border-rose-300";
    case "مرتجع":
      return "bg-violet-100 text-violet-800 border-violet-300";
    default:
      return "bg-gray-100 text-gray-800 border-gray-300";
  }
}

/**
 * props:
 *  - value (string)
 *  - onChange(nextValue)
 *  - disabled (bool)
 *  - className (optional)
 */
export default function StatusSelect({
  value = "",
  onChange,
  disabled,
  className = "",
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      className={[
        "xx px-2 py-1 rounded-lg border text-sm transition-colors",
        "dark:bg-gray-800/60", // شكل مقبول في الوضع الداكن
        colorClasses(value),
        disabled
          ? "opacity-60 cursor-not-allowed"
          : "cursor-pointer hover:brightness-[.98]",
        className,
      ].join(" ")}
      aria-label="تغيير حالة الصيانة"
    >
      {statusOptions.map((s) => (
        <option key={s} value={s}>
          {emojiFor(s)} {s}
        </option>
      ))}
    </select>
  );
}
