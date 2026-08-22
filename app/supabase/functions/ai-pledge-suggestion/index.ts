import { corsHeaders, jsonResponse } from "./_shared/cors.ts";
import { userClient, fmtR } from "./_shared/supabaseClient.ts";
import { completeJson, AiUnavailableError } from "./_shared/ai.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = userClient(req);
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return jsonResponse({ error: "Not signed in." }, 401);

    const body = await req.json().catch(() => ({}));
    const description = String(body?.description ?? "").trim();
    if (!description) return jsonResponse({ error: "Description is required." }, 400);

    const { data: buyer, error: buyerErr } = await supabase
      .from("buyer_profiles")
      .select("business_name, business_type, pool_id")
      .eq("id", user.id)
      .single();
    if (buyerErr || !buyer?.pool_id) return jsonResponse({ error: "Buyer profile not found." }, 404);

    const { data: links } = await supabase
      .from("supplier_pool_links")
      .select("supplier_id")
      .eq("pool_id", buyer.pool_id)
      .eq("status", "active");
    const supplierIds = (links ?? []).map((l) => l.supplier_id);
    if (supplierIds.length === 0) {
      return jsonResponse({ error: "No suppliers are active in your pool yet." }, 404);
    }

    const { data: items } = await supabase
      .from("items")
      .select("id, name, unit, base_price, item_tiers(tier_index, threshold, price)")
      .in("supplier_id", supplierIds);
    if (!items || items.length === 0) {
      return jsonResponse({ error: "This pool has no catalog items yet." }, 404);
    }

    const { data: totalsRows } = await supabase.rpc("pool_item_totals", { p_pool_id: buyer.pool_id });
    const totals = new Map<string, number>((totalsRows ?? []).map((r) => [r.item_id, Number(r.total_qty)]));

    const vm = items.map((it) => {
      const tiers = [...it.item_tiers].sort((a, b) => a.tier_index - b.tier_index);
      const total = totals.get(it.id) ?? 0;
      let achievedIdx = -1;
      tiers.forEach((t, i) => { if (total >= t.threshold) achievedIdx = i; });
      const currentPrice = achievedIdx >= 0 ? Number(tiers[achievedIdx].price) : Number(it.base_price);
      return { id: it.id, name: it.name, unit: it.unit, basePrice: Number(it.base_price), currentPrice, total };
    });

    const catalogText = vm
      .map((it) => `- ${it.name} (unit: ${it.unit}, base ${fmtR(it.basePrice)}, current pool price ${fmtR(it.currentPrice)}, ${it.total} units pledged so far)`)
      .join("\n");

    const prompt = `You are helping a small food & beverage business decide how many units to pledge into a group-buying pool.

Buyer: ${buyer.business_name}, a ${buyer.business_type}.
Business description from the owner: "${description}"

Available pool items:
${catalogText}

Pick the ONE item that best fits this business and suggest a specific pledge quantity (a whole number of units) reasonable for a small independent shop. Respond with ONLY strict JSON, no markdown, no commentary, in this exact shape:
{"item":"<exact item name from the list above>","quantity":<integer>,"rationale":"<one sentence, factual, under 25 words>"}`;

    const parsed = await completeJson<{ item: string; quantity: number; rationale: string }>(prompt);
    const matched = vm.find((it) => it.name.toLowerCase() === String(parsed.item ?? "").toLowerCase()) ?? vm[0];

    return jsonResponse({
      itemId: matched.id,
      itemName: matched.name,
      quantity: Math.max(1, Math.round(Number(parsed.quantity)) || 1),
      rationale: parsed.rationale ?? "",
    });
  } catch (e) {
    if (e instanceof AiUnavailableError) {
      return jsonResponse({ error: "Couldn't reach the AI suggestion service. Try again in a moment." }, 503);
    }
    console.error(e);
    return jsonResponse({ error: "Unexpected error." }, 500);
  }
});
