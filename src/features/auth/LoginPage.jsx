import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import InputField from "../../components/InputField.jsx";
import Button from "../../components/Button.jsx";
import VoiceInput from "../../components/VoiceInput.jsx";
import Notification from "../../components/Notification.jsx";
import axios from "axios";
import useAuthStore from "./authStore.js";

const LoginPage = () => {
  const { token, user } = useAuthStore();
  if (token && user) return <Navigate to="/repairs" replace />;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const { data } = await axios.post(
        "https://mobile-repairs-shop-api.vercel.app/api/auth/login",
        { username, password }
      );

      // حفظ البيانات
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("loginTime", Date.now());
      setIsLogin(true);

      // ✅ التحويل لصفحة الصيانات
      navigate("/repairs", { replace: true });
    } catch (err) {
      console.log(err);
      setIsLogin(false);
      setError(err.response?.data?.message || "حدث خطأ أثناء تسجيل الدخول");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50 dark:bg-gray-900">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md bg-white dark:bg-gray-800 shadow-md rounded px-6 py-8"
      >
        <h1 className="text-2xl font-bold mb-6 text-center">تسجيل الدخول</h1>

        {error && <Notification type="error" message={error} />}

        <div className="relative flex items-center mb-2">
          <input
            className="w-full border-[1px] border-gray-200 p-2 rounded-lg rounded-e-[0]"
            label="اسم المستخدم"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ادخل اسم المستخدم"
            autoComplete="true"
            required
          />
          <div className="">
            <VoiceInput onText={(text) => setUsername(text)} />
          </div>
        </div>
        <div className="relative flex items-center mb-2">
          <input
            className="w-full border-[1px] border-gray-200 p-2 rounded-lg rounded-e-[0]"
            label="كلمة المرور"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="ادخل كلمة المرور"
            required
          />
          <div className="">
            <VoiceInput onText={(text) => setPassword(text)} />
          </div>
        </div>

        <Button type="submit" className="w-full mt-4">
          دخول
        </Button>
      </form>
    </div>
  );
};

export default LoginPage;
