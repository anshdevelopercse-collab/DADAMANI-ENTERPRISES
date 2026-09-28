import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MainLayout } from './components/layout/MainLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { TenderListPage } from './pages/tenders/TenderListPage';
import { TenderDetailPage } from './pages/tenders/TenderDetailPage';
import { AwardedListPage } from './pages/awarded/AwardedListPage';
import { VehicleListPage } from './pages/vehicles/VehicleListPage';
import { WorkOrderListPage } from './pages/work-orders/WorkOrderListPage';
import { ExcelImportPage } from './pages/excel-import/ExcelImportPage';
import { DocumentListPage } from './pages/documents/DocumentListPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { AuditLogPage } from './pages/audit-logs/AuditLogPage';
import { UserListPage } from './pages/users/UserListPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { WorkforceListPage } from './pages/workforce/WorkforceListPage';
import { InvoiceListPage } from './pages/invoices/InvoiceListPage';
import { ContractAdvanceListPage } from './pages/advances/ContractAdvanceListPage';
import { GemFeeListPage } from './pages/gem-fees/GemFeeListPage';
import { CompanyListPage } from './pages/companies/CompanyListPage';
import { NotFoundPage } from './pages/errors/NotFoundPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: string }> = ({
  children,
  requiredRole,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole && user?.role !== 'Admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Auth Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Enterprise Portal */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="tenders" element={<TenderListPage />} />
            <Route path="tenders/:id" element={<TenderDetailPage />} />
            <Route path="awarded" element={<AwardedListPage />} />
            <Route path="vehicles" element={<VehicleListPage />} />
            <Route path="work-orders" element={<WorkOrderListPage />} />
            <Route path="workforce" element={<WorkforceListPage />} />
            <Route path="invoices" element={<InvoiceListPage />} />
            <Route path="contract-advances" element={<ContractAdvanceListPage />} />
            <Route path="gem-fees" element={<GemFeeListPage />} />
            <Route path="companies" element={<CompanyListPage />} />
            <Route path="excel-import" element={<ExcelImportPage />} />
            <Route path="documents" element={<DocumentListPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="audit-logs" element={<AuditLogPage />} />
            <Route
              path="users"
              element={
                <ProtectedRoute requiredRole="Admin">
                  <UserListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="settings"
              element={
                <ProtectedRoute requiredRole="Admin">
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
