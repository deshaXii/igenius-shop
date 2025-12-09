// src/features/chat/ChatPage.jsx
import { useEffect, useRef, useState, useMemo } from "react";
import API from "../../lib/api";
import { Link } from "react-router-dom";
import MessageBubble from "./ui/MessageBubble";
import Skeleton from "../../components/Skeleton";

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

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [techs, setTechs] = useState([]);
  const [q, setQ] = useState(""); // بحث في الفنيين
  const [text, setText] = useState("");
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [sending, setSending] = useState(false);

  const listRef = useRef(null);
  const bottomStickRef = useRef(true); // هل المستخدم في أسفل القائمة؟
  const lastMsgIdRef = useRef(null); // آخر رسالة شفناها
  const [showNewNotice, setShowNewNotice] = useState(false); // رسائل جديدة أثناء وجود المستخدم أعلى

  async function loadMsgs() {
    if (document.hidden) return; // اختصار استهلاك عند تبويب غير نشط
    try {
      setLoadingMsgs((v) => (messages.length ? v : true));
      const msgs = await API.get("/chat/public").then((r) => r.data);
      // هل وصل جديد والمستخدم مش تحت؟
      const newestId = msgs?.[msgs.length - 1]?._id || null;
      const hasNew = newestId && newestId !== lastMsgIdRef.current;
      setMessages(msgs);
      if (hasNew) {
        lastMsgIdRef.current = newestId;
        if (bottomStickRef.current) {
          queueMicrotask(() => scrollToBottom());
        } else {
          setShowNewNotice(true);
        }
      }
    } finally {
      setLoadingMsgs(false);
    }
  }

  async function loadUsers() {
    try {
      setLoadingUsers(true);
      const t = await API.get("/technicians").then((r) => r.data);
      setTechs(t);
    } finally {
      setLoadingUsers(false);
    }
  }

  useEffect(() => {
    loadMsgs();
    loadUsers();
    const i = setInterval(loadMsgs, 5000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  useEffect(() => {
    if (bottomStickRef.current) scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, loadingMsgs]);

  async function send() {
    const content = text.trim();
    if (!content) return;
    setSending(true);

    // إرسال تفاؤلي: أضف فقاعة محلية مؤقتًا
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
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
      await API.post("/chat/public", { content });
      await loadMsgs(); // تثبيت من السيرفر
    } finally {
      setSending(false);
    }
  }

  const filteredTechs = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return techs;
    return techs.filter(
      (t) =>
        (t.name || "").toLowerCase().includes(s) ||
        (t.username || "").toLowerCase().includes(s)
    );
  }, [q, techs]);

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {/* الرسائل */}
      <section className="md:col-span-2 flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
        <header className="p-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h1 className="text-lg font-bold">الشات العام</h1>
          <div className="text-xs opacity-70 hidden sm:block">
            يتم التحديث كل 5 ثوانٍ
          </div>
        </header>

        <div
          ref={listRef}
          onScroll={onScroll}
          className="flex-1 p-3 overflow-auto flex flex-col gap-3"
        >
          {loadingMsgs ? (
            <>
              <Skeleton className="h-16 w-[80%]" />
              <Skeleton className="h-16 w-[70%] self-end" />
              <Skeleton className="h-16 w-[60%]" />
            </>
          ) : messages.length ? (
            messages.map((m) => (
              <div key={m._id} className={cls(m._optimistic && "opacity-70")}>
                <MessageBubble m={m} />
              </div>
            ))
          ) : (
            <div className="text-center opacity-70 py-10">
              لا توجد رسائل بعد
            </div>
          )}
        </div>

        {/* إشعار رسائل جديدة */}
        {showNewNotice && (
          <div className="mx-auto -mt-6 mb-2">
            <button
              onClick={scrollToBottom}
              className="px-3 py-1.5 rounded-full bg-blue-600 text-white text-sm text-[16px] shadow"
            >
              رسائل جديدة — اضغط للانتقال للأسفل
            </button>
          </div>
        )}

        {/* Composer */}
        <footer className="p-2 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !e.shiftKey
                  ? (e.preventDefault(), send())
                  : null
              }
              className="flex-1 resize-none max-h-40 min-h-10 rounded-xl bg-gray-100 dark:bg-gray-800 p-2 outline-none"
              placeholder="اكتب رسالتك… (اضغط Enter للإرسال، Shift+Enter لسطر جديد)"
              aria-label="محرر الرسائل"
            />
            <button
              onClick={send}
              disabled={sending || !text.trim()}
              className={cls(
                "px-4 py-2 rounded-xl text-white inline-flex items-center gap-2",
                sending || !text.trim()
                  ? "bg-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              )}
              aria-label="إرسال الرسالة"
            >
              {sending && <Spinner />} <span>إرسال</span>
            </button>
          </div>
        </footer>
      </section>

      {/* قائمة الفنيين / DM */}
      <aside className="space-y-3">
        <div className="p-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <div className="font-semibold mb-2">مراسلة خاصة</div>

          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm text-[16px] mb-2"
            placeholder="بحث عن فني…"
            aria-label="بحث عن فني"
          />

          {loadingUsers ? (
            <>
              <Skeleton className="h-9 w-full mb-2" />
              <Skeleton className="h-9 w-[90%]" />
            </>
          ) : (
            <ul className="space-y-1 max-h-[60vh] overflow-auto">
              {filteredTechs.map((t) => (
                <li key={t._id}>
                  <Link
                    to={`/chat/dm/${t._id}`}
                    className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 hover:opacity-90"
                    title={`مراسلة ${t.name}`}
                  >
                    <span className="font-medium">{t.name}</span>
                    <span className="opacity-60 text-xs">@{t.username}</span>
                  </Link>
                </li>
              ))}
              {!filteredTechs.length && (
                <li className="opacity-70 text-sm text-[16px] py-2 text-center">
                  لا نتائج
                </li>
              )}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
