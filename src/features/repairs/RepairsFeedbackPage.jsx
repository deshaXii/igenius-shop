// src/features/repairs/RepairsFeedbackPage.jsx
import { useEffect, useMemo, useState } from "react";
import { RepairsAPI } from "../../lib/api";

function fmt(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "—";
  }
}

function normalizeFeedbackItem(raw, idx) {
  const repair =
    raw?.repair ||
    raw?.repairDoc ||
    raw?.repairData ||
    raw?.repairItem ||
    raw;

  const fb =
    raw?.customerFeedback ||
    raw?.feedback ||
    repair?.customerFeedback ||
    repair?.feedback ||
    {};

  const repairDbId = repair?._id || repair?.id || raw?._id || raw?.id;
  const repairPublicId = repair?.repairId || raw?.repairId;

  const feedbackDbId =
    fb?._id || raw?.customerFeedbackId || raw?.feedbackId || null;

  const key = String(
    feedbackDbId || repairDbId || repairPublicId || raw?.token || idx
  );

  const hasRating = Number(fb?.rating) >= 1 && Number(fb?.rating) <= 5;
  const hasNote = !!String(fb?.note || "").trim();
  const hasFeedback = hasRating || hasNote;

  return {
    raw,
    repair,
    fb,
    key,
    hasFeedback,
    hasRating,
    hasNote,
  };
}

export default function RepairsFeedbackPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [starFilter, setStarFilter] = useState(0);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await RepairsAPI.feedbackList();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.response?.data?.message || "تعذر تحميل التقييمات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const normalized = useMemo(() => {
    return (items || []).map(normalizeFeedbackItem).filter((x) => x.hasFeedback);
  }, [items]);

  const stats = useMemo(() => {
    const total = normalized.length;
    if (!total) return { total: 0, avg: 0, counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };

    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    let ratedCount = 0;

    for (const it of normalized) {
      const r = Number(it.fb?.rating || 0);
      if (r >= 1 && r <= 5) {
        counts[r] = (counts[r] || 0) + 1;
        sum += r;
        ratedCount += 1;
      }
    }

    return {
      total,
      avg: ratedCount ? sum / ratedCount : 0,
      counts,
    };
  }, [normalized]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return normalized.filter((x) => {
      const fb = x.fb || {};
      const r = Number(fb.rating || 0);

      if (starFilter && r !== starFilter) return false;

      if (!term) return true;

      const rep = x.repair || {};

      const name =
        rep.customerName || rep.clientName || rep.customer?.name || "";

      const device =
        rep.deviceType || rep.deviceName || rep.model || rep.device || "";

      const problem =
        rep.problemDescription || rep.issue || rep.problem || "";

      const note = fb.note || "";

      const repairIdentifier =
        rep.repairId || x.raw?.repairId || rep._id || x.raw?._id || "";

      const haystack = `${name} ${device} ${problem} ${note} ${repairIdentifier}`
        .toLowerCase()
        .trim();

      return haystack.includes(term);
    });
  }, [normalized, search, starFilter]);

  if (loading) {
    return <div>جارِ تحميل التقييمات…</div>;
  }

  if (err) {
    return (
      <div className="p-3 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-between gap-2">
        <span>{err}</span>
        <button
          type="button"
          onClick={load}
          className="px-3 py-1 rounded-lg bg-rose-600 text-white text-xs"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <header className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-xl font-bold">تقييمات العملاء</h1>
          <p className="text-xs text-gray-500 mt-1">
            كل تقييم نجوم + ملاحظات مكتوبة لكل صيانة.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs">
            <div className="text-[11px] text-gray-500 mb-1">متوسط التقييم</div>
            <div className="flex items-center gap-2">
              <StarRow rating={stats.avg} size={14} />
              <span className="text-sm font-semibold">
                {stats.avg ? stats.avg.toFixed(2) : "—"}/5
              </span>
              <span className="text-[11px] text-gray-500">
                ({stats.total} تقييم)
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500">فلترة حسب:</span>
          <button
            type="button"
            onClick={() => setStarFilter(0)}
            className={`px-2 py-1 rounded-lg border text-[11px] ${
              starFilter === 0
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700"
            }`}
          >
            الكل
          </button>
          {[5, 4, 3, 2, 1].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStarFilter(s)}
              className={`px-2 py-1 rounded-lg border flex items-center gap-1 text-[11px] ${
                starFilter === s
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700"
              }`}
            >
              <StarRow rating={s} size={10} />
              <span>({stats.counts?.[s] || 0})</span>
            </button>
          ))}
        </div>

        <div className="ms-auto">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم / الجهاز / المشكلة / الملاحظة…"
              className="w-64 max-w-full rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-8 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">
              <SearchIcon />
            </span>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-700 text-xs text-gray-500">
          لا توجد تقييمات مطابقة للبحث الحالي.
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((x) => {
            const rep = x.repair || {};
            const fb = x.fb || {};
            const rating = Number(fb.rating || 0);

            const name =
              rep.customerName ||
              rep.clientName ||
              rep.customer?.name ||
              "عميل بدون اسم";

            const device =
              rep.deviceType || rep.deviceName || rep.model || rep.device || "—";

            const problem =
              rep.problemDescription || rep.issue || rep.problem || "—";

            const repairNo =
              rep.repairId ||
              x.raw?.repairId ||
              (rep._id ? String(rep._id).slice(-6) : null) ||
              (x.raw?._id ? String(x.raw._id).slice(-6) : null) ||
              "—";

            return (
              <article
                key={x.key} // ✅ مفتاح فريد فعلاً
                className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3 md:p-4 flex flex-col gap-3"
              >
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  <div className="flex flex-col gap-0.5">
                    <div className="text-sm font-semibold">{name}</div>
                    <div className="text-[11px] text-gray-500">
                      جهاز: {device}
                      {problem && problem !== "—" && (
                        <>
                          {" "}
                          • المشكلة: <span>{problem}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="ms-auto flex flex-col items-end gap-1">
                    <StarRow rating={rating} size={14} />
                    <span className="text-[11px] text-gray-500">
                      صيانة #{repairNo}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {fmt(fb.createdAt || rep.createdAt || x.raw?.createdAt)}
                    </span>
                  </div>
                </div>

                {fb.note && (
                  <div className="rounded-xl bg-gray-50 dark:bg-gray-800/80 px-3 py-2 text-xs md:text-sm text-gray-800 dark:text-gray-100">
                    {fb.note}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StarRow({ rating, size = 14 }) {
  const full = Math.round(Number(rating) || 0);
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} filled={i <= full} size={size} />
      ))}
    </div>
  );
}

function StarIcon({ filled, size = 14 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={
        filled ? "text-yellow-400" : "text-gray-300 dark:text-gray-600"
      }
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1"
    >
      <path d="M12 3.3 14.4 9l6 .5-4.6 3.9 1.4 5.9L12 16.6 6.8 19.3 8.2 13 3.6 9.5 9.6 9 12 3.3Z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="6" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" />
    </svg>
  );
}
