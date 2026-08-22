import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { RequireAuth, RequireRole, RequireAnyRole, RequireNoRole } from "./components/RouteGuards";
import LoginPage from "./routes/LoginPage";
import AuthCallbackPage from "./routes/AuthCallbackPage";
import QuickJoinPage from "./routes/QuickJoinPage";
import OnboardingBuyerPage from "./routes/OnboardingBuyerPage";
import OnboardingSupplierPage from "./routes/OnboardingSupplierPage";
import BuyerDashboardPage from "./routes/BuyerDashboardPage";
import MyPoolPage from "./routes/MyPoolPage";
import MySummaryPage from "./routes/MySummaryPage";
import SupplierPoolsGridPage from "./routes/SupplierPoolsGridPage";
import SupplierPoolDetailPage from "./routes/SupplierPoolDetailPage";
import SupplierOpportunitiesPage from "./routes/SupplierOpportunitiesPage";
import OrderSummaryGridPage from "./routes/OrderSummaryGridPage";
import OrderSummaryDetailPage from "./routes/OrderSummaryDetailPage";
import SettingsPage from "./routes/SettingsPage";
import AccountPage from "./routes/AccountPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/join/:code" element={<QuickJoinPage />} />

        <Route
          path="/onboarding/buyer"
          element={
            <RequireAuth>
              <RequireNoRole>
                <OnboardingBuyerPage />
              </RequireNoRole>
            </RequireAuth>
          }
        />
        <Route
          path="/onboarding/supplier"
          element={
            <RequireAuth>
              <RequireNoRole>
                <OnboardingSupplierPage />
              </RequireNoRole>
            </RequireAuth>
          }
        />

        <Route
          path="/buyer"
          element={
            <RequireRole role="buyer">
              <BuyerDashboardPage />
            </RequireRole>
          }
        />
        <Route
          path="/buyer/pool"
          element={
            <RequireRole role="buyer">
              <MyPoolPage />
            </RequireRole>
          }
        />
        <Route
          path="/buyer/summary"
          element={
            <RequireRole role="buyer">
              <MySummaryPage />
            </RequireRole>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireRole role="buyer">
              <SettingsPage />
            </RequireRole>
          }
        />
        <Route
          path="/account"
          element={
            <RequireRole role="buyer">
              <AccountPage />
            </RequireRole>
          }
        />

        <Route
          path="/supplier"
          element={
            <RequireRole role="supplier">
              <SupplierPoolsGridPage />
            </RequireRole>
          }
        />
        <Route
          path="/supplier/pools/:poolId"
          element={
            <RequireRole role="supplier">
              <SupplierPoolDetailPage />
            </RequireRole>
          }
        />
        <Route
          path="/supplier/opportunities"
          element={
            <RequireRole role="supplier">
              <SupplierOpportunitiesPage />
            </RequireRole>
          }
        />

        <Route
          path="/summary"
          element={
            <RequireAnyRole>
              <OrderSummaryGridPage />
            </RequireAnyRole>
          }
        />
        <Route
          path="/summary/:poolId/:supplierId"
          element={
            <RequireAnyRole>
              <OrderSummaryDetailPage />
            </RequireAnyRole>
          }
        />

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Route>
    </Routes>
  );
}
