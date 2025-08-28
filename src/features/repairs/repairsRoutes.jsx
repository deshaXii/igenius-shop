import React from "react";
import { Routes, Route } from "react-router-dom";
import RepairsPage from "./RepairsPage.jsx";
import NewRepairPage from "./NewRepairPage.jsx";

const RepairsRoutes = () => {
  return (
    <Routes>
      <Route index element={<RepairsPage />} />
      <Route path="new" element={<NewRepairPage />} />
    </Routes>
  );
};

export default RepairsRoutes;
