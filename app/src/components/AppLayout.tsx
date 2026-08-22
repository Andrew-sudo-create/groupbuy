import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu, Box } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { useAuth } from "../lib/AuthContext";

export function AppLayout() {
  const { loading } = useAuth();
  const { pathname } = useLocation();
  const showSidebar = pathname !== "/login" && !pathname.startsWith("/join/");
  const [navOpen, setNavOpen] = useState(false);

  // Close the mobile drawer whenever the route changes (covers back/forward
  // nav and any programmatic redirect, not just link clicks inside it).
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg text-muted font-sans">
        Loading…
      </div>
    );
  }
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-bg text-text font-sans">
      {showSidebar && (
        <>
          <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar sticky top-0 z-30">
            <span className="flex items-center font-bold text-base tracking-tight">
              <Box size={18} className="mr-2 text-accent-light flex-shrink-0" />
              GroupBuy B2B
            </span>
            <button
              onClick={() => setNavOpen(true)}
              aria-label="Open menu"
              className="w-9 h-9 flex items-center justify-center rounded-lg border-none bg-transparent text-text cursor-pointer hover:bg-surface-2"
            >
              <Menu size={20} />
            </button>
          </div>
          <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
        </>
      )}
      <main className="flex-1 min-w-0 overflow-y-auto md:h-screen">
        <Outlet />
      </main>
    </div>
  );
}
