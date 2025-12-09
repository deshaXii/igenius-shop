// src/features/auth/LoginPage.jsx
import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Button from "../../components/Button.jsx";
import Notification from "../../components/Notification.jsx";
import axios from "axios";
import useAuthStore from "./authStore.js";

const LoginPage = () => {
  const { token, user } = useAuthStore();
  if (token && user) return <Navigate to="/repairs" replace />;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // --- Prefill from "remember me" ---
  useEffect(() => {
    try {
      const rememberFlag = localStorage.getItem("rememberMe");
      const rememberedUsername =
        localStorage.getItem("rememberedUsername") || "";
      if (rememberFlag === "1") {
        setRemember(true);
        if (rememberedUsername) setUsername(rememberedUsername);
      } else {
        setRemember(false);
      }
    } catch {}
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const payload = {
        username: username.trim(),
        password,
      };
      const { data } = await axios.post(
        "http://localhost:5000/api/auth/login",
        payload
      );

      // حفظ البيانات (الواجهة تعتمد على localStorage حالياً)
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("loginTime", Date.now());

      // تذكر اسم المستخدم فقط (لا نخزّن الباسورد)
      try {
        if (remember) {
          localStorage.setItem("rememberMe", "1");
          localStorage.setItem("rememberedUsername", payload.username);
        } else {
          localStorage.removeItem("rememberMe");
          localStorage.removeItem("rememberedUsername");
        }
      } catch {}

      navigate("/repairs", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "حدث خطأ أثناء تسجيل الدخول");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-white/20 dark:border-gray-800 overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-3 text-center">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-indigo-600/10 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-indigo-600">
                <path
                  fill="currentColor"
                  d="M12 2a6 6 0 00-6 6v2H5a1 1 0 00-1 1v8a3 3 0 003 3h10a3 3 0 003-3v-8a1 1 0 00-1-1h-1V8a6 6 0 00-6-6zm-4 8V8a4 4 0 118 0v2H8zm-1 2h10v7a1 1 0 01-1 1H7a1 1 0 01-1-1v-7z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mt-3 text-gray-900 dark:text-white">
              تسجيل الدخول
            </h1>
            <p className="text-sm text-[16px] text-gray-500 dark:text-gray-400 mt-1">
              ادخل بيانات حسابك للمتابعة
            </p>
          </div>

          {/* Body */}
          <form onSubmit={handleLogin} className="px-6 pb-6 pt-3 space-y-4">
            {error && <Notification type="error" message={error} />}

            {/* Username */}
            <div>
              <label className="block mb-1 text-sm text-[16px] font-medium text-gray-700 dark:text-gray-300">
                اسم المستخدم أو البريد
              </label>
              <div className="relative">
                <input
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 pr-10 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="مثال: admin أو admin@mail.com"
                  autoComplete="username"
                  required
                  inputMode="email"
                />
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                  @
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block mb-1 text-sm text-[16px] font-medium text-gray-700 dark:text-gray-300">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 pr-10 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  minLength={4}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  aria-label={
                    showPwd ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
                  }
                  className="absolute left-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {showPwd ? (
                    // eye-off
                    <svg viewBox="0 0 24 24" className="w-5 h-5">
                      <path
                        fill="currentColor"
                        d="M2.81 2.81a1 1 0 011.42 0l16.96 16.96a1 1 0 01-1.42 1.42l-2.2-2.2A11.5 11.5 0 0112 20C6.5 20 2.27 16.64 1 12c.45-1.61 1.3-3.08 2.45-4.3l-1.64-1.64a1 1 0 010-1.42zM12 6c5.5 0 9.73 3.36 11 8-.43 1.54-1.22 2.96-2.3 4.14l-2.13-2.13A5 5 0 009.99 9.3L7.58 6.89A11.4 11.4 0 0112 6zm0 4a2 2 0 011.73 3l-2.73-2.73c.31-.17.65-.27 1-.27zm-3 2a3 3 0 005.2 2.1l-4.3-4.3A3 3 0 009 12z"
                      />
                    </svg>
                  ) : (
                    // eye
                    <svg viewBox="0 0 24 24" className="w-5 h-5">
                      <path
                        fill="currentColor"
                        d="M12 5c5.5 0 9.73 3.36 11 8-1.27 4.64-5.5 8-11 8S2.27 17.64 1 13c1.27-4.64 5.5-8 11-8zm0 2C7.58 7 3.86 9.55 2.7 13 3.86 16.45 7.58 19 12 19s8.14-2.55 9.3-6C20.14 9.55 16.42 7 12 7zm0 3a3 3 0 110 6 3 3 0 010-6z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember me + submit */}
            <div className="flex items-center justify-between">
              <label className="inline-flex items-center gap-2 text-sm text-[16px] text-gray-700 dark:text-gray-300 select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>تذكّرني (حفظ اسم المستخدم)</span>
              </label>
            </div>

            <Button
              type="submit"
              className="w-full mt-2 !bg-indigo-600 hover:!bg-indigo-700 focus:!ring-indigo-500 disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? "جارٍ الدخول…" : "دخول"}
            </Button>

            {/* Tips */}
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
              لأمانك، لا نقوم بحفظ كلمة المرور مطلقًا.
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center text-white/90 text-xs mt-3">
          v{import.meta?.env?.VITE_APP_VERSION || "1.0"} • Africa/Cairo
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
