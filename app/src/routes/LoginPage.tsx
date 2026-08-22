import { useState } from "react";
import { Navigate } from "react-router-dom";
import { ShoppingBasket, Warehouse, ArrowRight, ArrowLeft, Mail } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { PrimaryButton, TextField, Label, PageKicker, ErrorNote } from "../components/ui";

const PENDING_ROLE_KEY = "groupbuy.pendingRole";

export default function LoginPage() {
  const { loading, profileLoading, user, role } = useAuth();
  const [chosenRole, setChosenRole] = useState<"buyer" | "supplier" | null>(null);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  if (!loading && user) {
    // Profile fetch is still in flight right after sign-in — role isn't known
    // yet, so don't guess (that would bounce a real buyer/supplier to onboarding).
    if (profileLoading) return null;
    if (role === "buyer") return <Navigate to="/buyer" replace />;
    if (role === "supplier") return <Navigate to="/supplier" replace />;
    // Signed in but mid-onboarding — send them back to finish it.
    const pending = localStorage.getItem(PENDING_ROLE_KEY);
    return <Navigate to={pending === "supplier" ? "/onboarding/supplier" : "/onboarding/buyer"} replace />;
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !chosenRole) return;
    setSending(true);
    setError(null);
    localStorage.setItem(PENDING_ROLE_KEY, chosenRole);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setSending(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setPasswordLoading(true);
    setPasswordError(null);
    // Same role hint as the magic-link path: only matters if this account has no
    // profile yet, in which case it decides which onboarding form to land on.
    if (chosenRole) localStorage.setItem(PENDING_ROLE_KEY, chosenRole);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setPasswordLoading(false);
    if (error) setPasswordError(error.message);
    // On success, onAuthStateChange updates the session and the redirect above takes over.
  }

  if (sent) {
    return (
      <div className="max-w-[560px] mx-auto px-6 py-16 text-center">
        <Mail size={28} className="mx-auto mb-4 text-accent-light" />
        <h1 className="text-2xl font-bold mb-2">Check your email</h1>
        <p className="text-muted text-sm leading-relaxed">
          We sent a sign-in link to <strong className="text-text">{email}</strong>. Open it on this device to
          continue as a {chosenRole}.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[1040px] mx-auto px-6 py-16 w-full">
      {!chosenRole ? (
        <>
          <div className="max-w-[620px] mx-auto mb-9 text-center">
            <PageKicker>Get started · step 1 of 2</PageKicker>
            <h1 className="text-[38px] font-bold tracking-tight leading-[1.15] mb-3">
              Pool your orders. Unlock bulk pricing.
            </h1>
            <p className="text-muted text-[15px] leading-relaxed m-0">
              GroupBuy B2B lets nearby cafés, bakeries and restaurants combine purchase orders so everyone qualifies
              for supplier volume discounts. Are you buying, or supplying?
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              onClick={() => setChosenRole("buyer")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setChosenRole("buyer");
                }
              }}
              className="bg-surface border border-border hover:border-accent/50 rounded-2xl p-7 cursor-pointer flex flex-col gap-2.5 transition-colors"
            >
              <ShoppingBasket size={24} className="text-accent-light" />
              <h3 className="mt-1 mb-0 text-[19px] font-semibold">I'm a buyer</h3>
              <p className="m-0 text-muted text-[13.5px] leading-relaxed">
                Join your neighborhood pool and pledge units to unlock supplier tier pricing.
              </p>
              <span className="inline-flex items-center gap-1.5 text-accent-light text-[13.5px] font-semibold mt-2">
                Continue <ArrowRight size={14} />
              </span>
            </div>
            <div
              onClick={() => setChosenRole("supplier")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setChosenRole("supplier");
                }
              }}
              className="bg-surface border border-border hover:border-accent/50 rounded-2xl p-7 cursor-pointer flex flex-col gap-2.5 transition-colors"
            >
              <Warehouse size={24} className="text-accent-light" />
              <h3 className="mt-1 mb-0 text-[19px] font-semibold">I'm a supplier</h3>
              <p className="m-0 text-muted text-[13.5px] leading-relaxed">
                Set tier pricing, track pool progress and draft order summaries.
              </p>
              <span className="inline-flex items-center gap-1.5 text-accent-light text-[13.5px] font-semibold mt-2">
                Continue <ArrowRight size={14} />
              </span>
            </div>
          </div>
        </>
      ) : (
        <div className="max-w-[440px]">
          <button
            onClick={() => setChosenRole(null)}
            className="inline-flex items-center gap-1.5 text-muted text-[13.5px] mb-5 bg-transparent border-none cursor-pointer p-0 font-sans"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <PageKicker>{chosenRole === "buyer" ? "Buyer" : "Supplier"} sign-in</PageKicker>
          <h1 className="text-[26px] font-bold tracking-tight mb-6">Enter your email to continue</h1>
          <form onSubmit={sendMagicLink} className="flex flex-col gap-4">
            <div>
              <Label>Email address</Label>
              <TextField
                type="email"
                required
                placeholder="you@business.co.za"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {error && <ErrorNote>{error}</ErrorNote>}
            <PrimaryButton type="submit" disabled={sending || !email.trim()} className="self-start">
              {sending ? "Sending…" : "Send sign-in link"}
            </PrimaryButton>
          </form>

          <button
            onClick={() => setUsePassword((v) => !v)}
            className="mt-4 text-muted text-[12.5px] bg-transparent border-none cursor-pointer p-0 underline font-sans"
          >
            {usePassword ? "Use a sign-in link instead" : "Have a password? Sign in directly"}
          </button>

          {usePassword && (
            <form onSubmit={signInWithPassword} className="flex flex-col gap-3 mt-3">
              <TextField
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {passwordError && <ErrorNote>{passwordError}</ErrorNote>}
              <PrimaryButton type="submit" disabled={passwordLoading || !email.trim() || !password} className="self-start">
                {passwordLoading ? "Signing in…" : "Sign in"}
              </PrimaryButton>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
