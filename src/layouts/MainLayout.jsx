// src/layouts/MainLayout.jsx
import { useEffect, useMemo, useState } from "react";
import {
  NavLink,
  Link,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import useAuthStore from "../features/auth/authStore";
import API from "../lib/api";
import NotificationsLive from "../realtime/NotificationsLive";
import { enablePush } from "../pwa/pushClient";

export default function MainLayout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const canAccessSettings =
    user?.role === "admin" ||
    user?.permissions?.adminOverride ||
    user?.permissions?.accessAccounts;

  useEffect(() => {
    // جرّب مرة واحدة لكل جلسة
    if (user) {
      enablePush().catch(() => {
        /* تجاهل لو المستخدم رفض */
      });
    } else {
      console.log("no user founded");
    }
  }, [user]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "system"
  );

  const pageTitle = useMemo(() => {
    const map = [
      ["/repairs", "الصيانات"],
      ["/invoices", "الفواتير"],
      ["/technicians", "الفنيون"],
      ["/chat", "الشات"],
      ["/notifications", "الإشعارات"],
      ["/settings", "الإعدادات"],
      ["/backup", "النسخ الاحتياطي"],
      ["/accounts", "الحسابات"],
    ];
    const m = map.find(([k]) => location.pathname.startsWith(k));
    return (m && m[1]) || "لوحة التحكم";
  }, [location.pathname]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await API.get("/notifications/unread-count").then(
          (x) => x.data
        );
        if (alive) setUnreadCount(Number(r?.count || 0));
      } catch {
        try {
          const r = await API.get("/notifications", {
            params: { unread: true, limit: 1 },
          }).then((x) => x.data);
          if (alive)
            setUnreadCount(
              Array.isArray(r) ? (r.length > 0 ? 1 : 0) : Number(r?.count || 0)
            );
        } catch {
          if (alive) setUnreadCount(0);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [location.pathname]);

  useEffect(() => {
    const root = document.documentElement;
    const apply = (m) => {
      if (m === "dark") root.classList.add("dark");
      else if (m === "light") root.classList.remove("dark");
      else {
        if (window.matchMedia("(prefers-color-scheme: dark)").matches)
          root.classList.add("dark");
        else root.classList.remove("dark");
      }
    };
    apply(theme);
    localStorage.setItem("theme", theme);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => theme === "system" && apply("system");
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [theme]);

  const NAV = [
    { to: "/repairs", label: "الصيانات", icon: <IconWrench /> },
    { to: "/invoices", label: "الفواتير", icon: <IconInvoice /> },
    { to: "/accounts", label: "الحسابات", icon: <IconInvoice /> },
    { to: "/technicians", label: "الفنيون", icon: <IconUsers /> },
    { to: "/chat", label: "المراسلات", icon: <IconChat /> },
    {
      to: "/notifications",
      label: "الإشعارات",
      icon: <IconBell />,
      badge: unreadCount,
    },
    ...(canAccessSettings
      ? [{ to: "/settings", label: "الإعدادات", icon: <IconSettings /> }]
      : []),
    { to: "/backup", label: "النسخ الاحتياطي", icon: <IconArchive /> },
  ];

  const [quickSearch, setQuickSearch] = useState("");
  function submitQuickSearch(e) {
    e.preventDefault();
    navigate("/repairs");
    setQuickSearch("");
  }

  return (
    <div
      dir="rtl"
      className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
    >
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          aria-hidden
        />
      )}

      <aside
        className={`fixed z-40 inset-y-0 right-0 w-72 transform transition-transform md:translate-x-0 md:static md:w-64
        bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800 ${
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        } md:rounded-none`}
        aria-label="القائمة الجانبية"
      >
        <div className="h-16 px-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
          <Link to="/" className="flex items-center gap-2 font-extrabold">
            <span className="text-blue-600">
              <IconLogo />
            </span>
            <span>AQSA</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="إغلاق القائمة"
          >
            <IconX />
          </button>
        </div>

        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
          {NAV.map((item) => (
            <SideLink
              key={item.to}
              to={item.to}
              icon={item.icon}
              badge={item.badge}
              onClick={() => setSidebarOpen(false)}
            >
              {item.label}
            </SideLink>
          ))}
        </nav>
      </aside>

      <div className="w-full">
        <header className="sticky top-0 z-20 backdrop-blur bg-white/70 dark:bg-gray-950/70 border-b border-gray-200 dark:border-gray-800">
          <div className="h-16 px-3 md:px-6 flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="فتح القائمة"
            >
              <IconMenu />
            </button>

            <div className="flex-1 flex items-center gap-3">
              <div className="text-lg md:text-xl font-bold truncate">
                {pageTitle}
              </div>
              <form
                onSubmit={submitQuickSearch}
                // sm:flex
                className="hidden  items-center gap-2 ml-auto"
              >
                <div className="relative">
                  <input
                    type="text"
                    value={quickSearch}
                    onChange={(e) => setQuickSearch(e.target.value)}
                    placeholder="بحث سريع…"
                    className="pl-10 pr-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 outline-none w-64"
                    aria-label="بحث سريع"
                  />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 opacity-60">
                    <IconSearch />
                  </span>
                </div>
                <button className="px-3 py-2 rounded-xl bg-blue-600 text-white">
                  بحث
                </button>
              </form>
            </div>

            <div className="flex items-center gap-2">
              <ThemeSwitch theme={theme} setTheme={setTheme} />
              {/* <button onClick={() => enablePush()}>enable Push</button> */}
              <Link
                to="/notifications"
                className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="الإشعارات"
              >
                <IconBell />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -left-1 min-w-[1.25rem] h-5 px-1 rounded-full bg-red-600 text-[11px] font-bold flex items-center justify-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
              <UserMenu
                user={user}
                onLogout={() => {
                  if (typeof logout === "function") logout();
                  navigate("/login");
                }}
              />
            </div>
          </div>
        </header>

        {/* 🔔 مستمع الإشعارات + التوست */}
        <NotificationsLive />

        <main className="px-3 md:px-6 py-4 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/* ==== components/icons/helpers (نفس اللي أرسلته سابقًا) ==== */
function SideLink({ to, icon, children, badge, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `group flex items-center gap-3 px-3 py-2 rounded-xl border
        ${
          isActive
            ? "bg-blue-600 text-white border-blue-600"
            : "bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900"
        }`
      }
    >
      <span className="text-lg">{icon}</span>
      <span className="flex-1">{children}</span>
      {typeof badge === "number" && badge > 0 && (
        <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-xs">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </NavLink>
  );
}
function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);
  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center font-bold">
          {getInitials(user?.name || user?.username || "U")}
        </div>
        <div className="hidden sm:block text-right leading-tight">
          <div className="font-semibold truncate max-w-[140px]">
            {user?.name || user?.username || "مستخدم"}
          </div>
          <div className="text-xs opacity-70">
            {user?.role === "admin" ? "أدمن" : "فني/مستخدم"}
          </div>
        </div>
      </button>
      {open && (
        <div
          className="absolute left-0 top-12 w-56 p-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg"
          role="menu"
        >
          <Link
            to={`/technicians/${user?.id || user?._id}/profile`}
            className="menu-item"
          >
            <IconUser /> الملف الشخصي
          </Link>
          <Link to="/chat" className="menu-item">
            <IconChat /> الشات
          </Link>
          <Link to="/notifications" className="menu-item">
            <IconBell /> الإشعارات
          </Link>
          <div className="my-1 h-px bg-gray-200 dark:bg-gray-800" />
          <button onClick={onLogout} className="menu-item text-red-600">
            <IconLogout /> تسجيل الخروج
          </button>
          <style>{`.menu-item{display:flex;align-items:center;gap:.5rem;padding:.5rem .75rem;border-radius:.75rem}
          .menu-item:hover{background:rgba(0,0,0,.04)}.dark .menu-item:hover{background:rgba(255,255,255,.06)}`}</style>
        </div>
      )}
    </div>
  );
}
function ThemeSwitch({ theme, setTheme }) {
  return (
    <div className="relative">
      <select
        aria-label="المظهر"
        className="px-2 py-2 rounded-xl bg-gray-100 dark:bg-gray-800"
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        title="المظهر"
      >
        <option value="system">النظام</option>
        <option value="light">فاتح</option>
        <option value="dark">داكن</option>
      </select>
    </div>
  );
}
function getInitials(name) {
  const parts = String(name).trim().split(/\s+/);
  const letters = (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
  return letters.toUpperCase() || "U";
}
function IconLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l8 4v6c0 5-3.5 9-8 10C7.5 21 4 17 4 12V6l8-4Zm0 2.2L6 6.5v5.4c0 3.9 2.5 7.2 6 8 3.5-.8 6-4.1 6-8V6.5l-6-2.3Z" />
    </svg>
  );
}
function IconMenu() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
    </svg>
  );
}
function IconX() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zM9.5 14C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
    </svg>
  );
}
function IconBell() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2Zm6-6V11a6 6 0 0 0-5-5.91V4a1 1 0 1 0-2 0v1.09A6 6 0 0 0 6 11v5l-2 2v1h16v-1l-2-2Z" />
    </svg>
  );
}
function IconWrench() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22 19l-6.5-6.5a5.5 5.5 0 0 1-7.7-7.7L10 6l3-3 1.2 2.2-1.8 1.8L14 9l2-1.6 1.8-1.8L20 7l-3 3 2 2 3 7Z" />
      <circle cx="7" cy="17" r="3" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Zm-10 8a6 6 0 0 1 12 0v1H6v-1Z" />
    </svg>
  );
}
function IconInvoice() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 2h10l3 3v15H4V2h3Zm8 2H7v14h10V7h-2V4ZM8 9h8v2H8V9Zm0 4h8v2H8v-2Z" />
    </svg>
  );
}
function IconChat() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 4h16v12H7l-3 3V4Zm2 4v2h12V8H6Zm0 4v2h9v-2H6Z" />
    </svg>
  );
}
function IconSettings() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Zm7.94-2.34-1.41-.82c.06-.44.06-.9 0-1.34l1.41-.82a.5.5 0 0 0 .18-.68l-1.5-2.6a.5.5 0 0 0-.64-.2l-1.41.82A6.9 6.9 0 0 0 15.5 5l-.26-1.62a.5.5 0 0 0-.5-.38h-3.48a.5.5 0 0 0-.5.38L10.5 5c-.66.1-1.3.3-1.9.57l-1.41-.82a.5.5 0 0 0-.64.2L5.05 7.55a.5.5 0 0 0 .18.68l1.41.82c-.06.44-.06.9 0 1.34l-1.41.82a.5.5 0 0 0-.18.68l1.5 2.6c.14.24.44.32.68.18l1.41-.82c.6.27 1.24.47 1.9.57l.26 1.62c.05.24.26.41.5.41h3.48c.24 0 .45-.17.5-.41l.26-1.62c.66-.1 1.3-.3 1.9-.57l1.41.82c.24.14.54.06.68-.18l1.5-2.6a.5.5 0 0 0-.18-.68l-.01-.01Z" />
    </svg>
  );
}
function IconArchive() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 7h16v13H4V7Zm1-4h14l2 3H3l2-3Zm3 7h8v2H8V10Z" />
    </svg>
  );
}
function IconUser() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.33 0-8 2.17-8 6v2h16v-2c0-3.83-3.67-6-8-6Z" />
    </svg>
  );
}
function IconLogout() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 17v-2h4v-2h-4V9l-5 3 5 3Zm3-14h7v18h-7v-2h5V5h-5V3ZM4 21h7v-2H6V5h5V3H4v18Z" />
    </svg>
  );
}
