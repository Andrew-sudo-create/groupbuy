import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { loading, user } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function RequireRole({ role, children }: { role: "buyer" | "supplier"; children: ReactNode }) {
  const { loading, profileLoading, user, role: myRole } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (profileLoading) return null;
  if (myRole === null) {
    return <Navigate to={role === "buyer" ? "/onboarding/buyer" : "/onboarding/supplier"} replace />;
  }
  if (myRole !== role) {
    return <Navigate to={myRole === "buyer" ? "/buyer" : "/supplier"} replace />;
  }
  return <>{children}</>;
}

/** Any signed-in, onboarded user (buyer or supplier) — used for the shared Order Summary route. */
export function RequireAnyRole({ children }: { children: ReactNode }) {
  const { loading, profileLoading, user, role } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (profileLoading) return null;
  if (role === null) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
