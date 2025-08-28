import React from "react";
import { Route } from "react-router-dom";
import BackupPage from "./BackupPage.jsx";

const BackupRoutes = (
  <Route path="/backup">
    <Route index element={<BackupPage />} />
  </Route>
);

export default BackupRoutes;
