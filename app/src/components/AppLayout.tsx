import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useAuth } from "../lib/AuthContext";

export function AppLayout() {
  const { loading } = useAuth();
  const { pathname } = useLocation();
  const showSidebar = pathname !== "/login";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg text-muted font-sans">
        Loading…
      </div>
    );
  }
  return (
    <div className="min-h-screen flex flex-row bg-bg text-text font-sans">
      {showSidebar && <Sidebar />}
      <main className="flex-1 min-w-0 overflow-y-auto h-screen">
        <Outlet />
      </main>
    </div>
  );
}
