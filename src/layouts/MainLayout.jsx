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
    if (user) {
      enablePush().catch(() => {
        /* تجاهل لو المستخدم رفض */
      });
    } else {
      console.log("no user founded");
    }
  }, [user]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "system"
  );

  const pageTitle = useMemo(() => {
    const map = [
      ["/repairs", "الصيانات"],
      ["/invoices", "الفواتير"],
      ["/technicians", "الفنيون"],
      ["/feedback", "التقييمات"],
      ["/chat", "المراسلات"],
      ["/notifications", "الإشعارات"],
      ["/settings", "الإعدادات"],
      ["/backup", "النسخ الاحتياطي"],
      ["/accounts", "الحسابات"],
      ["/inventory", "المخزن"],
      ["/suppliers", "الموردون"],
      ["/settings/departments", "الأقسام"],
    ];
    const m = map.find(([k]) => location.pathname.startsWith(k));
    return (m && m[1]) || "لوحة التحكم";
  }, [location.pathname]);

  // تحميل عدد الإشعارات غير المقروءة
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

  // تفعيل/تطبيق الـ theme (system / light / dark)
  useEffect(() => {
    const root = document.documentElement;

    const apply = (mode) => {
      if (mode === "dark") {
        root.classList.add("dark");
      } else if (mode === "light") {
        root.classList.remove("dark");
      } else {
        if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      }
    };

    apply(theme);
    localStorage.setItem("theme", theme);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => theme === "system" && apply("system");
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [theme]);

  // سكاشن القائمة الجانبية
  const navSections = useMemo(() => {
    const systemItems = [];
    if (canAccessSettings) {
      systemItems.push({
        to: "/settings",
        label: "الإعدادات",
        icon: <IconSettings />,
      });
    }
    systemItems.push({
      to: "/backup",
      label: "النسخ الاحتياطي",
      icon: <IconArchive />,
    });

    return [
      {
        id: "data",
        title: "البيانات",
        items: [
          { to: "/repairs", label: "الصيانات", icon: <IconWrench /> },
          { to: "/invoices", label: "الفواتير", icon: <IconInvoice /> },
          { to: "/accounts", label: "الحسابات", icon: <IconInvoice /> },
          { to: "/technicians", label: "الفنيون", icon: <IconUsers /> },
          { to: "/inventory", label: "المخزن", icon: <IconBox /> },
          { to: "/suppliers", label: "الموردون", icon: <IconTruck /> },
          {
            to: "/settings/departments",
            label: "الأقسام",
            icon: <IconLayers />,
          },
        ],
      },
      {
        id: "comm",
        title: "التواصل",
        items: [
          { to: "/feedback", label: "التقييمات", icon: <IconStarNav /> },
          { to: "/chat", label: "المراسلات", icon: <IconChat /> },
          {
            to: "/notifications",
            label: "الإشعارات",
            icon: <IconBell />,
            badge: unreadCount,
          },
        ],
      },
      {
        id: "system",
        title: "النظام",
        items: systemItems,
      },
    ];
  }, [canAccessSettings, unreadCount]);

  const [quickSearch, setQuickSearch] = useState("");
  function submitQuickSearch(e) {
    e.preventDefault();
    if (!quickSearch.trim()) return;
    navigate("/repairs");
    setQuickSearch("");
  }

  return (
    <div
      dir="rtl"
      className="flex min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100"
    >
      {/* طبقة خلفية عند فتح القائمة على الموبايل */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          aria-hidden
        />
      )}

      {/* الشريط الجانبي */}
      <aside
        className={`fixed inset-y-0 right-0 z-40 w-72 transform transition-all duration-300 bg-white/95 dark:bg-gray-950/95 border-l border-gray-200 dark:border-gray-800 md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        } ${sidebarCollapsed ? "md:w-20" : "md:w-64"}`}
        aria-label="القائمة الجانبية"
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-200 dark:border-gray-800 px-4">
          <Link
            to="/"
            className="flex items-center gap-3 font-bold tracking-tight text-gray-900 dark:text-gray-50"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-sm">
              <IconLogo />
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col">
                <span className="text-sm text-[16px] leading-tight">
                  IGenius
                </span>
                <span className="text-[11px] font-normal text-gray-500 dark:text-gray-400">
                  نظام إدارة صيانة الموبايل
                </span>
              </div>
            )}
          </Link>

          <div className="flex items-center gap-1">
            {/* زر تصغير/تكبير الشريط – سطح المكتب فقط */}
            <button
              type="button"
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="hidden md:inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label={sidebarCollapsed ? "توسيع القائمة" : "تصغير القائمة"}
            >
              {sidebarCollapsed ? (
                <IconSidebarExpand />
              ) : (
                <IconSidebarCollapse />
              )}
            </button>

            {/* زر إغلاق القائمة – موبايل فقط */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="إغلاق القائمة"
              type="button"
            >
              <IconX />
            </button>
          </div>
        </div>

        <nav className="h-[calc(100vh-4rem)] overflow-y-auto px-3 py-3 space-y-4">
          {navSections.map((section) => (
            <div key={section.id} className="mb-1 last:mb-0">
              {/* عنوان السيكشن */}
              {!sidebarCollapsed && (
                <div className="px-2 pt-1 pb-1 text-[11px] font-semibold text-gray-500/80 tracking-wide flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                  <span>{section.title}</span>
                </div>
              )}
              {sidebarCollapsed && (
                <div className="hidden md:block my-2 h-px bg-gray-200 dark:bg-gray-800" />
              )}

              <div className="mt-1 space-y-1">
                {section.items.map((item) => (
                  <SideLink
                    key={item.to}
                    to={item.to}
                    icon={item.icon}
                    badge={item.badge}
                    onClick={() => setSidebarOpen(false)}
                    collapsed={sidebarCollapsed}
                  >
                    {item.label}
                  </SideLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* منطقة المحتوى */}
      <div className="flex min-h-screen flex-1 flex-col">
        {/* الهيدر */}
        <header className="sticky top-0 z-20 border-b border-gray-200/80 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm">
          <div className="flex h-16 items-center gap-2 px-3 md:px-6">
            {/* زر فتح القائمة في الموبايل */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="فتح القائمة"
              type="button"
            >
              <IconMenu />
            </button>

            <div className="flex flex-1 items-center gap-3">
              <div className="min-w-0">
                <div className="text-sm text-[16px] md:text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {pageTitle}
                </div>
                <p className="hidden sm:block text-xs text-gray-500 dark:text-gray-400 truncate">
                  إدارة الأجهزة، الفنيين، الحسابات والمخزن من مكان واحد
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeSwitch theme={theme} setTheme={setTheme} />

              <Link
                to="/notifications"
                className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="الإشعارات"
              >
                <IconBell />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -left-1 min-w-[1.25rem] h-5 px-1 rounded-full bg-red-600 text-[11px] font-bold flex items-center justify-center text-white">
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

        {/* المحتوى الفعلي للصفحات */}
        <main className="px-3 md:px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

/* ==== Links in sidebar ==== */
function SideLink({ to, icon, children, badge, onClick, collapsed }) {
  const label = typeof children === "string" ? children : undefined;

  return (
    <NavLink
      to={to}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={({ isActive }) => {
        const base =
          "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-[16px] font-medium transition-colors";
        const collapsedCls = collapsed ? "justify-center" : "";
        const activeCls =
          "bg-blue-600 text-white shadow-[0_10px_25px_rgba(37,99,235,0.35)]";
        const inactiveCls =
          "text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-900/70";
        return [base, collapsedCls, isActive ? activeCls : inactiveCls]
          .filter(Boolean)
          .join(" ");
      }}
    >
      <span className="text-lg shrink-0">{icon}</span>
      {!collapsed && <span className="flex-1 truncate">{children}</span>}
      {typeof badge === "number" && badge > 0 && (
        <span className="ml-auto flex h-5 min-w-[1.5rem] items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </NavLink>
  );
}

/* ==== قائمة المستخدم ==== */
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
        type="button"
      >
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center font-bold text-sm">
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
          <button
            onClick={onLogout}
            className="menu-item text-red-600"
            type="button"
          >
            <IconLogout /> تسجيل الخروج
          </button>

          <style>{`.menu-item{display:flex;align-items:center;gap:.5rem;padding:.5rem .75rem;border-radius:.75rem;font-size:0.875rem}
          .menu-item:hover{background:rgba(0,0,0,.04)}.dark .menu-item:hover{background:rgba(255,255,255,.06)}`}</style>
        </div>
      )}
    </div>
  );
}

/* ==== مبدل الثيم في الهيدر ==== */
function ThemeSwitch({ theme, setTheme }) {
  const isDark = theme === "dark";

  const toggle = () => {
    if (theme === "dark") setTheme("light");
    else if (theme === "light") setTheme("dark");
    else {
      // system → قلب بين dark/light ببساطة
      setTheme(isDark ? "light" : "dark");
    }
  };

  return (
    <div className="relative">
      <button
        aria-label="تبديل المظهر"
        onClick={toggle}
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        {isDark ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 640 640"
            className="w-4 h-4 fill-gray-100"
          >
            <path d="M320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576C388.8 576 451.3 548.8 497.3 504.6C504.6 497.6 506.7 486.7 502.6 477.5C498.5 468.3 488.9 462.6 478.8 463.4C473.9 463.8 469 464 464 464C362.4 464 280 381.6 280 280C280 207.9 321.5 145.4 382.1 115.2C391.2 110.7 396.4 100.9 395.2 90.8C394 80.7 386.6 72.5 376.7 70.3C358.4 66.2 339.4 64 320 64z" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 640 640"
            className="w-4 h-4 fill-yellow-400"
          >
            <path d="M210.2 53.9C217.6 50.8 226 51.7 232.7 56.1L320.5 114.3L408.3 56.1C415 51.7 423.4 50.9 430.8 53.9C438.2 56.9 443.4 63.5 445 71.3L465.9 174.5L569.1 195.4C576.9 197 583.5 202.4 586.5 209.7C589.5 217 588.7 225.5 584.3 232.2L526.1 320L584.3 407.8C588.7 414.5 589.5 422.9 586.5 430.3C583.5 437.7 576.9 443.1 569.1 444.6L465.8 465.4L445 568.7C443.4 576.5 438 583.1 430.7 586.1C423.4 589.1 414.9 588.3 408.2 583.9L320.4 525.7L232.6 583.9C225.9 588.3 217.5 589.1 210.1 586.1C202.7 583.1 197.3 576.5 195.8 568.7L175 465.4L71.7 444.5C63.9 442.9 57.3 437.5 54.3 430.2C51.3 422.9 52.1 414.4 56.5 407.7L114.7 320L56.5 232.2C52.1 225.5 51.3 217.1 54.3 209.7C57.3 202.3 63.9 196.9 71.7 195.4L175 174.6L195.9 71.3C197.5 63.5 202.9 56.9 210.2 53.9zM239.6 320C239.6 275.6 275.6 239.6 320 239.6C364.4 239.6 400.4 275.6 400.4 320C400.4 364.4 364.4 400.4 320 400.4C275.6 400.4 239.6 364.4 239.6 320z" />
          </svg>
        )}
      </button>
    </div>
  );
}

function getInitials(name) {
  const parts = String(name).trim().split(/\s+/);
  const letters = (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
  return letters.toUpperCase() || "U";
}

/* ==== Icons ==== */
function IconLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
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
function IconSidebarCollapse() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M15 5 9 12l6 7v-3.5L12.5 12 15 8.5V5z" />
    </svg>
  );
}
function IconSidebarExpand() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 5v3.5L11.5 12 9 15.5V19l6-7-6-7z" />
    </svg>
  );
}

/* أيقونات إضافية للمخزن / الموردين / الأقسام */
function IconBox() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 7l8-4 8 4v10l-8 4-8-4V7Zm8-2.2L6.5 7 12 9.8 17.5 7 12 4.8ZM6 9.3v6.4L11 18v-6.4L6 9.3Zm7 2.3V18l5-2.3v-6.4l-5 2.3Z" />
    </svg>
  );
}
function IconTruck() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 5h10v11H3V5Zm12 3h3l3 4v4h-2.1A2.5 2.5 0 0 0 18 18.5 2.5 2.5 0 0 0 15.1 16H13V8Zm1 2v4h2.4L18 12.5 16 10Zm-8.5 8A2.5 2.5 0 1 1 3 15.5 2.5 2.5 0 0 1 7.5 18Zm0-1.5a1 1 0 1 0-1-1 1 1 0 0 0 1 1Zm10.5 1.5a2.5 2.5 0 1 1 2.5-2.5A2.5 2.5 0 0 1 18 18Zm0-1.5a1 1 0 1 0-1-1 1 1 0 0 0 1 1Z" />
    </svg>
  );
}
function IconLayers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3 3 8l9 5 9-5-9-5Zm0 9.35L5 8.3 3 9.5l9 5.2 9-5.2-2-1.2-7 4.05Zm0 4.5L5 13.8 3 15l9 5 9-5-2-1.2-7 3.05Z" />
    </svg>
  );
}
function IconStarNav() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3.3 14.4 9l6 .5-4.6 3.9 1.4 5.9L12 16.6 6.8 19.3 8.2 13 3.6 9.5 9.6 9 12 3.3Z" />
    </svg>
  );
}
