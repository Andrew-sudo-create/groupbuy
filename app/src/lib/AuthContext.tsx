import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";
import type { Tables } from "./database.types";

export type BuyerProfile = Tables<"buyer_profiles">;
export type SupplierProfile = Tables<"supplier_profiles">;

interface AuthState {
  /** True only until the very first session check resolves. */
  loading: boolean;
  /** True whenever a signed-in user's buyer/supplier profile is being (re)fetched —
   *  including right after sign-in, when `user` is already set but `role` isn't
   *  known yet. Callers that redirect based on `role` should wait for this to
   *  clear first, or they'll bounce a freshly-signed-in user to onboarding. */
  profileLoading: boolean;
  session: Session | null;
  user: User | null;
  role: "buyer" | "supplier" | null;
  buyerProfile: BuyerProfile | null;
  supplierProfile: SupplierProfile | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

async function loadProfiles(userId: string) {
  const [{ data: buyer }, { data: supplier }] = await Promise.all([
    supabase.from("buyer_profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("supplier_profiles").select("*").eq("id", userId).maybeSingle(),
  ]);
  return { buyer, supplier };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [buyerProfile, setBuyerProfile] = useState<BuyerProfile | null>(null);
  const [supplierProfile, setSupplierProfile] = useState<SupplierProfile | null>(null);

  const refreshProfile = useCallback(async () => {
    const uid = session?.user?.id;
    if (!uid) {
      setBuyerProfile(null);
      setSupplierProfile(null);
      return;
    }
    setProfileLoading(true);
    const { buyer, supplier } = await loadProfiles(uid);
    setBuyerProfile(buyer);
    setSupplierProfile(supplier);
    setProfileLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      if (data.session?.user) {
        setProfileLoading(true);
        const { buyer, supplier } = await loadProfiles(data.session.user.id);
        if (cancelled) return;
        setBuyerProfile(buyer);
        setSupplierProfile(supplier);
        setProfileLoading(false);
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        setProfileLoading(true);
        const { buyer, supplier } = await loadProfiles(newSession.user.id);
        setBuyerProfile(buyer);
        setSupplierProfile(supplier);
        setProfileLoading(false);
      } else {
        setBuyerProfile(null);
        setSupplierProfile(null);
        setProfileLoading(false);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const role: AuthState["role"] = buyerProfile ? "buyer" : supplierProfile ? "supplier" : null;

  const value: AuthState = {
    loading,
    profileLoading,
    session,
    user: session?.user ?? null,
    role,
    buyerProfile,
    supplierProfile,
    refreshProfile,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
