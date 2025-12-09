export default function Avatar({ name = "مستخدم", size = 36, className = "" }) {
  const initials =
    String(name)
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "U";

  const fontSize = size <= 28 ? "0.65rem" : size <= 40 ? "0.75rem" : "0.85rem";

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-100 ring-2 ring-white/70 dark:ring-gray-900/80 shadow-sm ${className}`}
      style={{
        width: size,
        height: size,
        fontWeight: 700,
        fontSize,
      }}
      aria-label={name}
      title={name}
    >
      {initials}
    </div>
  );
}
