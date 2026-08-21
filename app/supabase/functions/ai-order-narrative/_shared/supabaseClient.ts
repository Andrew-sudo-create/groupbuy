import { createClient } from "jsr:@supabase/supabase-js@2";

// Forwards the caller's JWT so every query still runs under their RLS policies —
// the edge function never has broader access than the signed-in user does.
export function userClient(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
}

export function fmtR(n: number): string {
  const hasDecimals = n % 1 !== 0;
  return "R" + n.toLocaleString("en-US", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
}
