// src/features/chat/DirectChatPage.jsx
import { useEffect, useRef, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import API from "../../lib/api";
import formatDate from "../../utils/formatDate"; // (مهم) default import

function cls(...a) {
  return a.filter(Boolean).join(" ");
}
function Spinner() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 animate-spin" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      ></path>
    </svg>
  );
}

export default function DirectChatPage() {
  const { userId } = useParams();
  const [list, setList] = useState([]);
  const [text, setText] = useState("");
  const [techs, setTechs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const listRef = useRef(null);
  const bottomStickRef = useRef(true);
  const [showNewNotice, setShowNewNotice] = useState(false);
  const lastMsgIdRef = useRef(null);

  async function loadUsers() {
    const t = await API.get("/technicians").then((r) => r.data);
    setTechs(t);
  }

  async function load() {
    if (!userId) return;
    setLoading((v) => (list.length ? v : true));
    const msgs = await API.get(`/chat/dm/${userId}`).then((r) => r.data);
    const newestId = msgs?.[msgs.length - 1]?._id || null;
    const hasNew = newestId && newestId !== lastMsgIdRef.current;
    setList(msgs);
    if (hasNew) {
      lastMsgIdRef.current = newestId;
      if (bottomStickRef.current) {
        queueMicrotask(() => scrollToBottom());
      } else {
        setShowNewNotice(true);
      }
    }
    setLoading(false);
  }

  function onScroll() {
    if (!listRef.current) return;
    const el = listRef.current;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    bottomStickRef.current = nearBottom;
    if (nearBottom) setShowNewNotice(false);
  }

  function scrollToBottom() {
    if (!listRef.current) return;
    listRef.current.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
    bottomStickRef.current = true;
    setShowNewNotice(false);
  }

  async function send() {
    const content = text.trim();
    if (!content || !userId) return;
    setSending(true);

    // تفاؤلي
    const tempId = `temp-${Date.now()}`;
    setList((prev) => [
      ...prev,
      {
        _id: tempId,
        content,
        createdAt: new Date().toISOString(),
        from: { name: "أنا" },
        _optimistic: true,
      },
    ]);
    setText("");
    scrollToBottom();

    try {
      await API.post(`/chat/dm/${userId}`, { content });
      await load();
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);
  useEffect(() => {
    load();
    const i = setInterval(load, 5000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const peer = useMemo(
    () => techs.find((t) => String(t._id) === String(userId)),
    [techs, userId]
  );

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">مراسلة خاصة</h1>
        <Link
          to="/chat"
          className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm"
        >
          العودة للشات العام
        </Link>
      </header>

      <div className="p-2 rounded-xl bg-white dark:bg-gray-800">
        <label className="text-sm text-[16px] opacity-80">
          اختر فنيًا سريعًا
        </label>
        <div className="flex flex-wrap gap-2 mt-2">
          {techs.map((t) => (
            <Link
              key={t._id}
              to={`/chat/dm/${t._id}`}
              className={cls(
                "px-3 py-1 rounded-lg",
                String(t._id) === String(userId)
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700"
              )}
            >
              {t.name}
            </Link>
          ))}
        </div>
      </div>

      <div
        className="p-3 rounded-xl bg-white dark:bg-gray-800 h-[60vh] overflow-auto flex flex-col"
        ref={listRef}
        onScroll={onScroll}
      >
        <div className="pb-2 text-sm text-[16px] opacity-70">
          تراسل مع: <span className="font-medium">{peer?.name || "—"}</span>
        </div>

        <div className="space-y-2">
          {loading ? (
            <>
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 h-14" />
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 h-14" />
            </>
          ) : list.length ? (
            list.map((m) => (
              <div key={m._id} className={cls(m._optimistic && "opacity-70")}>
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                  <div className="text-xs opacity-80">
                    {m?.from?.name || "مستخدم"} — {formatDate(m.createdAt)}
                  </div>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="opacity-70 text-center py-10">لا توجد رسائل</div>
          )}
        </div>
      </div>

      {showNewNotice && (
        <div className="mx-auto -mt-6">
          <button
            onClick={scrollToBottom}
            className="px-3 py-1.5 rounded-full bg-blue-600 text-white text-sm text-[16px] shadow"
          >
            رسائل جديدة — اضغط للانتقال للأسفل
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && !e.shiftKey
              ? (e.preventDefault(), send())
              : null
          }
          className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-gray-800 min-h-10 max-h-40 resize-none"
          placeholder={`اكتب رسالة إلى ${peer?.name || "الفني"}…`}
          aria-label="محرر رسالة خاصة"
        />
        <button
          onClick={send}
          className={cls(
            "px-4 py-2 rounded-xl text-white inline-flex items-center gap-2",
            text.trim()
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-blue-400 cursor-not-allowed"
          )}
          disabled={!text.trim() || sending}
        >
          {sending && <Spinner />} <span>إرسال</span>
        </button>
      </div>
    </div>
  );
}
