import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";

// Demo-only shared password for the seeded gN@demo.io guest accounts used at
// live presentations. These accounts hold no real data and exist solely so
// attendees can scan a QR code and land straight on a populated dashboard —
// never reuse this pattern for real user accounts.
const DEMO_PASSWORD = "groupbuy2026";
const CODE_PATTERN = /^g([1-9]|1[0-5])$/; // g1–g15

export default function QuickJoinPage() {
  const { code } = useParams<{ code: string }>();
  const { profileLoading, role } = useAuth();
  const [status, setStatus] = useState<"joining" | "done" | "error">("joining");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code || !CODE_PATTERN.test(code)) {
      setStatus("error");
      setError("Unknown guest link.");
      return;
    }
    supabase.auth.signInWithPassword({ email: `${code}@demo.io`, password: DEMO_PASSWORD }).then(({ error }) => {
      if (error) {
        setStatus("error");
        setError(error.message);
        return;
      }
      setStatus("done");
    });
  }, [code]);

  if (status === "done" && !profileLoading && role === "buyer") {
    return <Navigate to="/buyer" replace />;
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg text-text font-sans px-6">
        <div className="text-center max-w-sm">
          <p className="text-error text-sm mb-3">{error}</p>
          <a href="/login" className="text-accent-light text-sm underline">
            Go to regular sign-in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg text-muted font-sans gap-2">
      <Loader2 size={18} className="animate-spin" />
      Joining as {code}…
    </div>
  );
}
