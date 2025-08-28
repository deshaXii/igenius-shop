import Avatar from "../../../components/Avatar";
import { formatDate } from "../../../utils/formatDate";
import useAuthStore from "../../auth/authStore";

export default function MessageBubble({ m }) {
  const me = useAuthStore((s) => s.user);
  const isMine = String(m?.from?._id || m?.from) === String(me?.id || me?._id);

  return (
    <div className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
      <Avatar name={m?.from?.name || "مستخدم"} size={32} />
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-sm
        ${
          isMine
            ? "bg-blue-600 text-white rounded-br-sm"
            : "bg-gray-100 dark:bg-gray-800 rounded-bl-sm"
        }`}
      >
        <div className="text-[11px] opacity-80 mb-0.5">
          {m?.from?.name || "مستخدم"} • {formatDate(m?.createdAt)}
        </div>
        <div className="whitespace-pre-wrap break-words">{m?.content}</div>
      </div>
    </div>
  );
}
