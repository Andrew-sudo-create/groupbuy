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
  X,
  Sparkles,
  ClipboardList,
} from "lucide-react";
import { useAuth } from "../lib/AuthContext";

function NavLink({
  to,
  icon,
  children,
  onNavigate,
}: {
  to: string;
  icon: ReactNode;
  children: ReactNode;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const active = location.pathname === to || location.pathname.startsWith(to + "/");
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium ${
        active ? "text-text bg-surface-2" : "text-muted hover:bg-surface-2/60"
      }`}
    >
      {icon}
      {children}
    </Link>
  );
}

export function Sidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const { role, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      {/* Backdrop — mobile only, shown while the drawer is open */}
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-overlay z-40 md:hidden"
          aria-hidden="true"
        />
      )}
      <aside
        className={`w-[232px] flex-shrink-0 bg-sidebar border-r border-border flex-col p-3.5 fixed inset-y-0 left-0 z-50 h-screen md:sticky md:top-0 md:flex ${
          open ? "flex" : "hidden"
        }`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="flex items-center font-bold text-base tracking-tight px-2">
            <Box size={18} className="mr-2 text-accent-light flex-shrink-0" />
            GroupBuy B2B
          </span>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg border-none bg-transparent text-muted cursor-pointer hover:bg-surface-2"
          >
            <X size={18} />
          </button>
        </div>
        {role && (
          <span className="self-start bg-surface-2 text-muted text-[11px] font-semibold px-2.5 py-1 rounded-full mx-2 mt-1.5 mb-4.5">
            {role === "buyer" ? "Buyer" : "Supplier"}
          </span>
        )}

        <nav className="flex flex-col gap-0.5 mt-2">
          {!role && (
            <NavLink to="/login" icon={<LogIn size={16} />} onNavigate={onClose}>
              Login
            </NavLink>
          )}
          {role === "buyer" && (
            <>
              <NavLink to="/buyer" icon={<ShoppingBasket size={16} />} onNavigate={onClose}>
                Buyer Dashboard
              </NavLink>
              <NavLink to="/buyer/requests" icon={<ClipboardList size={16} />} onNavigate={onClose}>
                My Requests
              </NavLink>
              <NavLink to="/buyer/opportunities" icon={<Sparkles size={16} />} onNavigate={onClose}>
                GroupBuy Opportunities
              </NavLink>
              <NavLink to="/buyer/pool" icon={<Users size={16} />} onNavigate={onClose}>
                My Pool
              </NavLink>
              <NavLink to="/buyer/summary" icon={<Receipt size={16} />} onNavigate={onClose}>
                My Summary
              </NavLink>
            </>
          )}
          {role === "supplier" && (
            <>
              <NavLink to="/supplier" icon={<Warehouse size={16} />} onNavigate={onClose}>
                Supplier Portal
              </NavLink>
              <NavLink to="/supplier/opportunities" icon={<Sparkles size={16} />} onNavigate={onClose}>
                AI Opportunities
              </NavLink>
            </>
          )}
          {role && (
            <NavLink to="/summary" icon={<FileText size={16} />} onNavigate={onClose}>
              Order Summary
            </NavLink>
          )}
        </nav>

        <div className="flex-1" />

        {role === "buyer" && (
          <>
            <div className="border-t border-border my-2" />
            <NavLink to="/settings" icon={<SlidersHorizontal size={16} />} onNavigate={onClose}>
              Settings
            </NavLink>
            <NavLink to="/account" icon={<UserCircle size={16} />} onNavigate={onClose}>
              Account
            </NavLink>
          </>
        )}
        {role && (
          <button
            onClick={async () => {
              await signOut();
              onClose?.();
              navigate("/login");
            }}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-muted bg-transparent border-none cursor-pointer text-left font-sans hover:bg-surface-2/60"
          >
            <LogOut size={16} />
            Log out
          </button>
        )}
      </aside>
    </>
  );
}
