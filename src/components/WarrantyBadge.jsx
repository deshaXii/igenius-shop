import formatDate from "../utils/formatDate";
export default function WarrantyBadge({ until }) {
  return (
    <span
      title={until ? `ضمان حتى ${formatDate(until)}` : "ضمان"}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"
    >
      <svg
        viewBox="0 0 24 24"
        className="w-3 h-3"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12 2l7 4v6c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-4zM8 11l2 2 4-4 1.5 1.5L10 15l-3.5-3.5L8 11z" />
      </svg>
      ضمان
    </span>
  );
}
