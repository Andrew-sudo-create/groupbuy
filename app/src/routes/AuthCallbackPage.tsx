import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

const PENDING_ROLE_KEY = "groupbuy.pendingRole";

export default function AuthCallbackPage() {
  const { loading, profileLoading, user, role } = useAuth();

  if (loading || (user && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg text-muted font-sans">Signing you in…</div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (role === "buyer") return <Navigate to="/buyer" replace />;
  if (role === "supplier") return <Navigate to="/supplier" replace />;

  const pending = localStorage.getItem(PENDING_ROLE_KEY);
  return <Navigate to={pending === "supplier" ? "/onboarding/supplier" : "/onboarding/buyer"} replace />;
}
