import { corsHeaders, jsonResponse } from "./_shared/cors.ts";
import { userClient } from "./_shared/supabaseClient.ts";
import { completeJson, AiUnavailableError } from "./_shared/anthropic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = userClient(req);
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return jsonResponse({ error: "Not signed in." }, 401);

    const { data: buyer, error: buyerErr } = await supabase
      .from("buyer_profiles")
      .select("business_name, business_type, pool_id, order_notes")
      .eq("id", user.id)
      .single();
    if (buyerErr || !buyer?.pool_id) return jsonResponse({ error: "Buyer profile not found." }, 404);

    const notes = String(buyer.order_notes ?? "").trim();
    if (!notes) {
      return jsonResponse({ error: "Add some order & stock notes on your Account page first." }, 400);
    }

    const { data: pool } = await supabase.from("pools").select("name, admin_buyer_id").eq("id", buyer.pool_id).single();
    let adminName = "nearby buyers";
    if (pool?.admin_buyer_id) {
      const { data: admin } = await supabase
        .from("buyer_profiles")
        .select("business_name")
        .eq("id", pool.admin_buyer_id)
        .single();
      if (admin?.business_name) adminName = admin.business_name;
    }
    const poolName = pool?.name ?? "your pool";

    const prompt = `You are reading messy, unsorted order history and stock notes for a small food & beverage business and turning them into a clear demand estimate.

Business: ${buyer.business_name}, a ${buyer.business_type} in ${poolName}.

Raw notes:
${notes}

Task 1: Write ONE sentence estimating how often this business reorders its main perishable and roughly how much stock they currently have left, in the style of: "You typically buy ~40L milk every 7 days and currently have ~12L in stock." Use only what the notes support, with approximate numbers.
Task 2: Write ONE sentence explaining why this business was matched into the "${poolName}" pool, referencing its business type and that the pool is anchored by nearby buyers such as ${adminName}.

Respond with ONLY strict JSON, no markdown: {"demandProfile":"...","poolMatchReason":"..."}`;

    const parsed = await completeJson<{ demandProfile: string; poolMatchReason: string }>(prompt);
    return jsonResponse({
      demandProfile: parsed.demandProfile ?? "",
      poolMatchReason: parsed.poolMatchReason ?? "",
    });
  } catch (e) {
    if (e instanceof AiUnavailableError) {
      return jsonResponse({ error: "Couldn't read the demand profile right now. Try again in a moment." }, 503);
    }
    console.error(e);
    return jsonResponse({ error: "Unexpected error." }, 500);
  }
});
