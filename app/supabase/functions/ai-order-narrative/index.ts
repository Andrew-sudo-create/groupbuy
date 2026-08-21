import { corsHeaders, jsonResponse } from "./_shared/cors.ts";
import { userClient, fmtR } from "./_shared/supabaseClient.ts";
import { completeText, AiUnavailableError } from "./_shared/anthropic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = userClient(req);
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return jsonResponse({ error: "Not signed in." }, 401);

    const body = await req.json().catch(() => ({}));
    const poolId = String(body?.poolId ?? "");
    const supplierId = String(body?.supplierId ?? "");
    if (!poolId || !supplierId) return jsonResponse({ error: "poolId and supplierId are required." }, 400);

    // Explicit authorization gate: pool member, pool admin, or the linked supplier
    // themself. (Downstream queries are RLS-protected too, but this gives a clear
    // 403 instead of silently returning an empty/misleading narrative.)
    const [{ data: myPoolId }, { data: isAdmin }, { data: isSupplierActive }] = await Promise.all([
      supabase.rpc("my_pool_id"),
      supabase.rpc("is_pool_admin", { p_pool_id: poolId }),
      supabase.rpc("is_supplier_active_in_pool", { p_pool_id: poolId }),
    ]);
    const authorized = myPoolId === poolId || isAdmin === true || (isSupplierActive === true && user.id === supplierId);
    if (!authorized) return jsonResponse({ error: "Not authorized to view this pool's summary." }, 403);

    const { data: pool } = await supabase.from("pools").select("name").eq("id", poolId).single();
    if (!pool) return jsonResponse({ error: "Pool not found." }, 404);

    const { data: items } = await supabase
      .from("items")
      .select("id, name, unit, base_price, item_tiers(tier_index, threshold, price)")
      .eq("supplier_id", supplierId);
    if (!items || items.length === 0) return jsonResponse({ error: "This supplier has no items." }, 404);
    const itemIds = items.map((i) => i.id);

    const { data: totalsRows } = await supabase.rpc("pool_item_totals", { p_pool_id: poolId });
    const totals = new Map<string, number>((totalsRows ?? []).map((r) => [r.item_id, Number(r.total_qty)]));

    const { data: pledgeRows } = await supabase
      .from("pledges")
      .select("buyer_id, item_id, qty, buyer_profiles(business_name, business_type)")
      .eq("pool_id", poolId)
      .in("item_id", itemIds);

    const vm = items.map((it) => {
      const tiers = [...it.item_tiers].sort((a, b) => a.tier_index - b.tier_index);
      const total = totals.get(it.id) ?? 0;
      let achievedIdx = -1;
      tiers.forEach((t, i) => { if (total >= t.threshold) achievedIdx = i; });
      const currentPrice = achievedIdx >= 0 ? Number(tiers[achievedIdx].price) : Number(it.base_price);
      const tierLabel = achievedIdx < 0 ? "Base price" : `Tier ${achievedIdx + 1}`;
      return { id: it.id, name: it.name, unit: it.unit, basePrice: Number(it.base_price), currentPrice, total, tierLabel };
    });

    type BuyerAgg = { name: string; type: string; units: number; spend: number; base: number };
    const buyerMap = new Map<string, BuyerAgg>();
    for (const row of pledgeRows ?? []) {
      const item = vm.find((v) => v.id === row.item_id);
      if (!item) continue;
      const bp = row.buyer_profiles as unknown as { business_name?: string; business_type?: string } | null;
      const entry = buyerMap.get(row.buyer_id) ?? { name: bp?.business_name ?? "Unknown", type: bp?.business_type ?? "", units: 0, spend: 0, base: 0 };
      entry.units += row.qty;
      entry.spend += row.qty * item.currentPrice;
      entry.base += row.qty * item.basePrice;
      buyerMap.set(row.buyer_id, entry);
    }
    const perBuyer = [...buyerMap.values()].map((b) => ({ ...b, savings: b.base - b.spend }));

    const totalUnits = vm.reduce((s, i) => s + i.total, 0);
    const totalSpend = vm.reduce((s, i) => s + i.total * i.currentPrice, 0);
    const totalBase = vm.reduce((s, i) => s + i.total * i.basePrice, 0);
    const totalSavings = totalBase - totalSpend;

    const itemLines = vm
      .map((i) => `${i.name}: ${i.total} ${i.unit} pledged, ${i.tierLabel} reached at ${fmtR(i.currentPrice)}/unit (base ${fmtR(i.basePrice)}), saving ${fmtR((i.basePrice - i.currentPrice) * i.total)} total.`)
      .join("\n");
    const buyerLines = perBuyer
      .map((b) => `${b.name} (${b.type}): ${b.units} units, ${fmtR(b.spend)} spend, ${fmtR(b.savings)} saved.`)
      .join("\n");

    const prompt = `Write a short, factual procurement summary (3-4 sentences, plain prose, no headers, no bullet points, no marketing language) for a supplier's draft purchase order compiled from a group-buying pool called "${pool.name}". Reference concrete numbers from the data below. Do not invent numbers not implied by the data.

Per-item results:
${itemLines}

Per-buyer results:
${buyerLines}

Totals: ${totalUnits} units, ${fmtR(totalSpend)} total spend, ${fmtR(totalSavings)} saved versus base pricing.`;

    const narrative = await completeText(prompt);
    return jsonResponse({ narrative });
  } catch (e) {
    if (e instanceof AiUnavailableError) {
      return jsonResponse({ error: "AI narrative unavailable right now — the numbers below are accurate regardless." }, 503);
    }
    console.error(e);
    return jsonResponse({ error: "Unexpected error." }, 500);
  }
});
