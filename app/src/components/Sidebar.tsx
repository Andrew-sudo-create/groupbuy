import { type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  LogIn,
  ShoppingBasket,
  Users,
  Receipt,
  Warehouse,
  FileText,
  SlidersHorizontal,
  UserCircle,
  LogOut,
} from "lucide-react";
import { useAuth } from "../lib/AuthContext";

function NavLink({ to, icon, children }: { to: string; icon: ReactNode; children: ReactNode }) {
  const location = useLocation();
  const active = location.pathname === to || location.pathname.startsWith(to + "/");
  return (
    <Link
      to={to}
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium ${
        active ? "text-text bg-surface-2" : "text-muted hover:bg-surface-2/60"
      }`}
    >
      {icon}
      {children}
    </Link>
  );
}

export function Sidebar() {
  const { role, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className="w-[232px] flex-shrink-0 bg-sidebar border-r border-border flex flex-col p-3.5 sticky top-0 h-screen">
      <span className="flex items-center font-bold text-base tracking-tight px-2 mb-1.5">
        <Box size={18} className="mr-2 text-accent-light" />
        GroupBuy B2B
      </span>
      {role && (
        <span className="self-start bg-surface-2 text-muted text-[11px] font-semibold px-2.5 py-1 rounded-full mx-2 mt-1.5 mb-4.5">
          {role === "buyer" ? "Buyer" : "Supplier"}
        </span>
      )}

      <nav className="flex flex-col gap-0.5 mt-2">
        {!role && (
          <NavLink to="/login" icon={<LogIn size={16} />}>
            Login
          </NavLink>
        )}
        {role === "buyer" && (
          <>
            <NavLink to="/buyer" icon={<ShoppingBasket size={16} />}>
              Buyer Dashboard
            </NavLink>
            <NavLink to="/buyer/pool" icon={<Users size={16} />}>
              My Pool
            </NavLink>
            <NavLink to="/buyer/summary" icon={<Receipt size={16} />}>
              My Summary
            </NavLink>
          </>
        )}
        {role === "supplier" && (
          <NavLink to="/supplier" icon={<Warehouse size={16} />}>
            Supplier Portal
          </NavLink>
        )}
        {role && (
          <NavLink to="/summary" icon={<FileText size={16} />}>
            Order Summary
          </NavLink>
        )}
      </nav>

      <div className="flex-1" />

      {role === "buyer" && (
        <>
          <div className="border-t border-border my-2" />
          <NavLink to="/settings" icon={<SlidersHorizontal size={16} />}>
            Settings
          </NavLink>
          <NavLink to="/account" icon={<UserCircle size={16} />}>
            Account
          </NavLink>
        </>
      )}
      {role && (
        <button
          onClick={async () => {
            await signOut();
            navigate("/login");
          }}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-muted bg-transparent border-none cursor-pointer text-left font-sans hover:bg-surface-2/60"
        >
          <LogOut size={16} />
          Log out
        </button>
      )}
    </aside>
  );
}
