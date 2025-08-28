import React from "react";
import { Routes, Route } from "react-router-dom";
import TechniciansPage from "./TechniciansPage.jsx";

const TechniciansRoutes = () => {
  return (
    <Routes>
      <Route index element={<TechniciansPage />} />
    </Routes>
  );
};

export default TechniciansRoutes;
