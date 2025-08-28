import React from "react";
import { Routes, Route } from "react-router-dom";
import LoginPage from "./LoginPage.jsx"; // تأكد إنه موجود فعليًا

const AuthRoutes = () => {
  return (
    <Routes>
      <Route index element={<LoginPage />} />
    </Routes>
  );
};

export default AuthRoutes;
