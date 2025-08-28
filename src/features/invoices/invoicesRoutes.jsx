import React from "react";
import { Route } from "react-router-dom";
import InvoicesPage from "./InvoicesPage.jsx";

const InvoicesRoutes = (
  <Route path="/invoices">
    <Route index element={<InvoicesPage />} />
  </Route>
);

export default InvoicesRoutes;
