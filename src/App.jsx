// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import AuthLayout from "./layouts/AuthLayout";
import LoginPage from "./features/auth/LoginPage";
import ProtectedRoute from "./features/auth/ProtectedRoute";
import PublicOnlyRoute from "./features/auth/PublicOnlyRoute";
import PublicTrackingPage from "./features/public/PublicTrackingPage";
import ReceiptPage from "./features/repairs/ReceiptPage";
import DepartmentsPage from "./features/departments/DepartmentsPage";

import RepairsPage from "./features/repairs/RepairsPage";
import NewRepairPage from "./features/repairs/NewRepairPage";
import RepairDetailsPage from "./features/repairs/RepairDetailsPage";
import EditRepairPage from "./features/repairs/EditRepairPage";

import TechniciansPage from "./features/technicians/TechniciansPage";
import TechnicianProfilePage from "./features/technicians/TechnicianProfilePage";

import InvoicesPage from "./features/invoices/InvoicesPage";
import AccountsPage from "./features/accounts/AccountsPage";
import BackupPage from "./features/backup/BackupPage";
import NotificationsPage from "./features/notifications/NotificationsPage";

import SettingsPage from "./features/settings/SettingsPage";
import ChatPage from "./features/chat/ChatPage";
import DirectChatPage from "./features/chat/DirectChatPage";

import InventoryPage from "./features/inventory/InventoryPage";
import SuppliersPage from "./features/suppliers/SuppliersPage";
import SupplierDetailsPage from "./features/suppliers/SupplierDetailsPage";

import RequirePermRoute from "./features/auth/RequirePermRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/t/:token" element={<PublicTrackingPage />} />
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* صفحات محمية */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/settings/departments" element={<DepartmentsPage />} />
          <Route index element={<Navigate to="/repairs" replace />} />
          <Route path="/repairs" element={<RepairsPage />} />
          <Route path="/repairs/new" element={<NewRepairPage />} />
          <Route path="/repairs/:id/receipt" element={<ReceiptPage />} />
          <Route path="/repairs/:id" element={<RepairDetailsPage />} />
          <Route path="/repairs/:id/edit" element={<EditRepairPage />} />
          <Route path="/technicians" element={<TechniciansPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/suppliers/:id" element={<SupplierDetailsPage />} />
          <Route
            path="/technicians/:id/profile"
            element={<TechnicianProfilePage />}
          />
          <Route element={<RequirePermRoute adminOnly />}>
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/backup" element={<BackupPage />} />
          </Route>
          {/* توحيد اسم الصلاحية */}
          <Route element={<RequirePermRoute perm="accessAccounts" />}>
            <Route path="/accounts" element={<AccountsPage />} />
          </Route>
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route element={<RequirePermRoute perm="settings" />}>
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/dm/:userId" element={<DirectChatPage />} />
        </Route>
      </Route>

      {/* أي مسار غير معروف → إلى repairs (سيتطلب auth) */}
      <Route path="*" element={<Navigate to="/repairs" replace />} />
    </Routes>
  );
}
