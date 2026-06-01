import React, { useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/infrastructure/queryClient';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { RBACProvider } from './contexts/RBACContext';
import { useSessionManager } from './lib/sessionManager';
import { migrateCashFromLocalStorage } from './utils/migrateCashFromLocalStorage';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Quotes from './pages/Quotes';
import PurchasesFactuSOL from './pages/PurchasesFactuSOL';
import CashRegisterV2 from './pages/CashRegisterV2';
import Advisors from './pages/Advisors';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import Accounting from './pages/Accounting';
import Suppliers from './pages/Suppliers';
import Warehouses from './pages/Warehouses';
import Customers from './pages/Customers';
import StockConciliation from './pages/StockConciliation';
import AdvisorCommissions from './pages/AdvisorCommissions';
import Reports from './pages/Reports';

function SessionGuard({ children }: { children: React.ReactNode }) {
  useSessionManager();
  const { user } = useAuth();

  useEffect(() => {
    const handler = (e: Event) => {
      const name = (e as CustomEvent<{ printerName: string }>).detail.printerName;
      toast.info(
        `Primera impresión: selecciona "${name}" en el diálogo y el navegador la recordará para siempre.`,
        { duration: 8000 }
      );
    };
    window.addEventListener('pos:printer-guide', handler);
    return () => window.removeEventListener('pos:printer-guide', handler);
  }, []);

  // Migración única de sesiones de caja desde localStorage → Supabase
  useEffect(() => {
    if (!user) return;
    const name = (user as any)?.user_metadata?.full_name ?? user.email ?? 'Usuario';
    migrateCashFromLocalStorage(name).catch(() => {});
  }, [user?.id]);

  return <>{children}</>;
}

function AppRoutes() {
  const { user, isAdmin } = useAuth();

  return (
    <Routes>
      {/* Ruta de login - redirige al dashboard si ya está autenticado */}
      <Route
        path="/login"
        element={user ? <Navigate to={isAdmin() ? '/' : '/sales'} replace /> : <Login />}
      />

      {/* Rutas protegidas - requieren autenticación */}
      <Route
        path="/"
        element={
          <ProtectedRoute requireAdmin>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute>
            <Layout>
              <Inventory />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales"
        element={
          <ProtectedRoute>
            <Layout>
              <Sales />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/quotes"
        element={
          <ProtectedRoute>
            <Layout>
              <Quotes />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/purchases"
        element={
          <ProtectedRoute requireAdmin>
            <Layout>
              <PurchasesFactuSOL />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/cash-register"
        element={
          <ProtectedRoute>
            <Layout>
              <CashRegisterV2 />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/advisors"
        element={
          <ProtectedRoute>
            <Layout>
              <Advisors />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/suppliers"
        element={
          <ProtectedRoute>
            <Layout>
              <Suppliers />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/alerts"
        element={
          <ProtectedRoute>
            <Layout>
              <Alerts />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/warehouses"
        element={
          <ProtectedRoute>
            <Layout>
              <Warehouses />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Rutas solo para administrador */}
      <Route
        path="/accounting"
        element={
          <ProtectedRoute requireAdmin>
            <Layout>
              <Accounting />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute requireAdmin>
            <Layout>
              <Settings />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/customers"
        element={
          <ProtectedRoute>
            <Layout>
              <Customers />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/stock-conciliation"
        element={
          <ProtectedRoute requireAdmin>
            <Layout>
              <StockConciliation />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/advisor-commissions"
        element={
          <ProtectedRoute requireAdmin>
            <Layout>
              <AdvisorCommissions />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Layout>
              <Reports />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <AuthProvider>
          <RBACProvider>
            <SessionGuard>
              <AppRoutes />
            </SessionGuard>
          </RBACProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
