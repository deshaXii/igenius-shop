export default function Avatar({ name = "مستخدم", size = 36, className = "" }) {
  const initials =
    String(name)
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "U";
  return (
    <div
      className={`inline-flex items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200 ${className}`}
      style={{ width: size, height: size, fontWeight: 700 }}
      aria-label={name}
      title={name}
    >
      {initials}
    </div>
  );
}
