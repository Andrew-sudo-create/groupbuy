// AI Group Opportunity Finder — supplier-facing.
//
// For each of the supplier's catalog items, looks at real pledge totals across
// EVERY pool (via the supplier_pool_item_totals RPC, which returns aggregate
// quantities, distinct-buyer counts, and an average pairwise buyer-distance in
// km — never buyer identity or individual positions, and never for pools the
// supplier hasn't pledged-into demand for), and searches combinations of
// not-yet-linked pools that would push the combined total over the next
// supplier-defined pricing tier. It ranks combinations by the savings they'd
// unlock, prefers geographically tighter buyer clusters when ties need
// breaking, flags fragile ones (single-buyer, over-concentrated, or widely
// scattered pools), and asks Gemini only to narrate the already-computed
// numbers — never to invent them.
//
// This directly answers the "predict need / find compatible businesses / size
// the combined demand / optimise the group / price it / size the saving / flag
// risk / explain / recommend the best one" pipeline; approving or dismissing a
// recommendation (human-in-the-loop) is a separate, ordinary DB write the
// frontend performs — this function only ever reads and reasons.

import { corsHeaders, jsonResponse } from "./_shared/cors.ts";
import { userClient, fmtR } from "./_shared/supabaseClient.ts";
import { completeText, AiUnavailableError } from "./_shared/ai.ts";

interface Tier {
  tier_index: number;
  threshold: number;
  price: number;
}

interface ItemRow {
  id: string;
  name: string;
  unit: string;
  base_price: number;
  item_tiers: Tier[];
}

function tierFor(tiers: Tier[], total: number): { idx: number; price: number; threshold: number | null } {
  const sorted = [...tiers].sort((a, b) => a.tier_index - b.tier_index);
  let idx = -1;
  for (let i = 0; i < sorted.length; i++) {
    if (total >= sorted[i].threshold) idx = i;
  }
  return {
    idx,
    price: idx >= 0 ? Number(sorted[idx].price) : undefined as unknown as number,
    threshold: idx + 1 < sorted.length ? sorted[idx + 1].threshold : null,
  };
}

function tierLabel(idx: number): string {
  return idx < 0 ? "Base price" : `Tier ${idx + 1}`;
}

interface Candidate {
  poolId: string;
  poolName: string;
  deliveryLocation: string;
  qty: number;
  buyerCount: number;
  linkStatus: "none" | "pending";
  buyerSpreadKm: number | null;
}

function subsetAvgSpread(subset: Candidate[]): number | null {
  const vals = subset.map((c) => c.buyerSpreadKm).filter((v): v is number => v != null);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function* subsetsOf<T>(arr: T[], maxSize: number): Generator<T[]> {
  const n = arr.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    if (popcount(mask) > maxSize) continue;
    const subset: T[] = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) subset.push(arr[i]);
    yield subset;
  }
}
function popcount(x: number): number {
  let c = 0;
  while (x) {
    c += x & 1;
    x >>= 1;
  }
  return c;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = userClient(req);
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return jsonResponse({ error: "Not signed in." }, 401);

    const { data: supplier, error: supplierErr } = await supabase
      .from("supplier_profiles")
      .select("id, company_name")
      .eq("id", user.id)
      .single();
    if (supplierErr || !supplier) return jsonResponse({ error: "Only suppliers can use the opportunity finder." }, 403);

    const [{ data: items }, { data: links }, { data: pools }, { data: totalsRows }, { data: feedback }] =
      await Promise.all([
        supabase.from("items").select("id, name, unit, base_price, item_tiers(tier_index, threshold, price)").eq("supplier_id", user.id),
        supabase.from("supplier_pool_links").select("pool_id, status").eq("supplier_id", user.id),
        supabase.from("pools").select("id, name, delivery_location"),
        supabase.rpc("supplier_pool_item_totals", { p_supplier_id: user.id }),
        supabase.from("ai_recommendation_feedback").select("item_id, pool_ids, status").eq("supplier_id", user.id),
      ]);

    if (!items || items.length === 0) return jsonResponse({ opportunities: [] });

    const poolById = new Map((pools ?? []).map((p) => [p.id, p]));
    const linkStatusByPool = new Map((links ?? []).map((l) => [l.pool_id, l.status]));
    const dismissedKeys = new Set(
      (feedback ?? []).filter((f) => f.status === "dismissed").map((f) => `${f.item_id}:${[...f.pool_ids].sort().join(",")}`),
    );

    type Opportunity = {
      itemId: string;
      itemName: string;
      unit: string;
      currentTierLabel: string;
      newTierLabel: string;
      priceBefore: string;
      priceAfter: string;
      combinedQtyBefore: number;
      combinedQtyAfter: number;
      thresholdNeeded: number;
      savings: number;
      pools: { poolId: string; poolName: string; deliveryLocation: string; addedQty: number; buyerCount: number; linkStatus: "none" | "pending"; buyerSpreadKm: number | null }[];
      riskFlags: string[];
      explanationPromptFacts: string;
    };

    const rawOpportunities: Opportunity[] = [];

    for (const item of items as unknown as ItemRow[]) {
      const tiers = item.item_tiers ?? [];
      if (tiers.length === 0) continue;

      const itemTotals = (totalsRows ?? []).filter((t) => t.item_id === item.id);
      const totalByPool = new Map(
        itemTotals.map((t) => [
          t.pool_id,
          { qty: Number(t.total_qty), buyers: Number(t.buyer_count), spreadKm: t.avg_buyer_distance_km != null ? Number(t.avg_buyer_distance_km) : null },
        ]),
      );

      const activeTotal = [...totalByPool.entries()]
        .filter(([poolId]) => linkStatusByPool.get(poolId) === "active")
        .reduce((s, [, v]) => s + v.qty, 0);
      const current = tierFor(tiers, activeTotal);
      const currentPrice = current.idx >= 0 ? current.price : Number(item.base_price);

      const candidates: Candidate[] = [...totalByPool.entries()]
        .filter(([poolId, v]) => linkStatusByPool.get(poolId) !== "active" && v.qty > 0 && poolById.has(poolId))
        .map(([poolId, v]) => {
          const pool = poolById.get(poolId)!;
          const status = linkStatusByPool.get(poolId);
          return {
            poolId,
            poolName: pool.name,
            deliveryLocation: pool.delivery_location,
            qty: v.qty,
            buyerCount: v.buyers,
            linkStatus: status === "pending" ? "pending" : "none",
            buyerSpreadKm: v.spreadKm,
          } as Candidate;
        })
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 6);

      if (candidates.length === 0) continue;

      let best: { subset: Candidate[]; combinedTotal: number; newTierIdx: number; spread: number | null } | null = null;
      for (const subset of subsetsOf(candidates, Math.min(4, candidates.length))) {
        const added = subset.reduce((s, c) => s + c.qty, 0);
        const combinedTotal = activeTotal + added;
        const result = tierFor(tiers, combinedTotal);
        if (result.idx <= current.idx) continue; // must actually cross into a better tier
        const spread = subsetAvgSpread(subset);
        const better =
          !best ||
          result.idx > best.newTierIdx ||
          (result.idx === best.newTierIdx &&
            (subset.length < best.subset.length ||
              (subset.length === best.subset.length &&
                (combinedTotal < best.combinedTotal ||
                  (combinedTotal === best.combinedTotal &&
                    spread != null && best.spread != null && spread < best.spread)))));
        if (better) best = { subset, combinedTotal, newTierIdx: result.idx, spread };
      }

      if (!best) continue;
      const key = `${item.id}:${[...best.subset.map((c) => c.poolId)].sort().join(",")}`;
      if (dismissedKeys.has(key)) continue;

      const newTier = tierFor(tiers, best.combinedTotal);
      const newPrice = newTier.idx >= 0 ? newTier.price : Number(item.base_price);
      const savings = (currentPrice - newPrice) * best.combinedTotal;
      if (savings <= 0) continue;

      const addedTotal = best.subset.reduce((s, c) => s + c.qty, 0);
      const maxContribution = Math.max(...best.subset.map((c) => c.qty));
      const riskFlags: string[] = [];
      if (best.subset.some((c) => c.buyerCount <= 1)) {
        riskFlags.push("Includes a pool where a single buyer accounts for all pledged demand — losing that one buyer removes the whole pool's contribution.");
      }
      if (addedTotal > 0 && maxContribution / addedTotal > 0.6) {
        const dominant = best.subset.find((c) => c.qty === maxContribution)!;
        riskFlags.push(`Over ${Math.round((maxContribution / addedTotal) * 100)}% of the added volume comes from ${dominant.poolName} alone — the group is fragile if that pool doesn't come through.`);
      }
      const achievedThreshold = [...tiers].sort((a, b) => a.tier_index - b.tier_index)[newTier.idx].threshold;
      if (best.combinedTotal - maxContribution < achievedThreshold) {
        riskFlags.push("Dropping the single largest contributing pool would fall back below this tier's threshold.");
      }
      const scattered = best.subset.filter((c) => c.buyerSpreadKm != null && c.buyerSpreadKm > 8);
      if (scattered.length > 0) {
        riskFlags.push(
          `Businesses driving demand in ${scattered.map((c) => `${c.poolName} (~${c.buyerSpreadKm!.toFixed(1)}km apart)`).join(", ")} are fairly spread out — delivery consolidation may be less efficient than a tighter cluster.`,
        );
      }

      const factLines = [
        `Item: ${item.name} (${item.unit}). Currently ${activeTotal} units linked-and-active at ${tierLabel(current.idx)} (${fmtR(currentPrice)}/unit).`,
        `Recommended group: ${best.subset.map((c) => `${c.poolName} (${c.deliveryLocation || "location TBD"}, ${c.qty} ${item.unit} pledged across ${c.buyerCount} buyer${c.buyerCount === 1 ? "" : "s"}${c.buyerSpreadKm != null ? `, businesses there are ~${c.buyerSpreadKm.toFixed(1)}km apart from each other` : ""})`).join("; ")}.`,
        `Adding them brings the combined total to ${best.combinedTotal} units, crossing into ${tierLabel(newTier.idx)} at ${fmtR(newPrice)}/unit — unlocking ${fmtR(savings)} in total savings versus staying at ${tierLabel(current.idx)}.`,
        riskFlags.length > 0 ? `Risk to flag: ${riskFlags.join(" ")}` : "No major concentration risk detected.",
      ].join("\n");

      rawOpportunities.push({
        itemId: item.id,
        itemName: item.name,
        unit: item.unit,
        currentTierLabel: tierLabel(current.idx),
        newTierLabel: tierLabel(newTier.idx),
        priceBefore: fmtR(currentPrice),
        priceAfter: fmtR(newPrice),
        combinedQtyBefore: activeTotal,
        combinedQtyAfter: best.combinedTotal,
        thresholdNeeded: achievedThreshold,
        savings,
        pools: best.subset.map((c) => ({
          poolId: c.poolId,
          poolName: c.poolName,
          deliveryLocation: c.deliveryLocation,
          addedQty: c.qty,
          buyerCount: c.buyerCount,
          linkStatus: c.linkStatus,
          buyerSpreadKm: c.buyerSpreadKm,
        })),
        riskFlags,
        explanationPromptFacts: factLines,
      });
    }

    rawOpportunities.sort((a, b) => b.savings - a.savings);
    const top = rawOpportunities.slice(0, 5);

    const explained = await Promise.all(
      top.map(async (o) => {
        const prompt = `You are explaining a group-buying recommendation to a supplier ("${supplier.company_name}") who sells wholesale via a group-buying platform. Write 2-3 short, factual sentences (plain prose, no headers or bullets): (1) why these pools are being grouped together for this item, (2) what price tier and saving the combination unlocks, referencing the pool names. Use ONLY the numbers given below — never invent figures.

${o.explanationPromptFacts}`;
        let explanation: string;
        try {
          explanation = await completeText(prompt, 220);
        } catch {
          explanation = `Combining ${o.pools.map((p) => p.poolName).join(", ")} brings ${o.itemName} from ${o.combinedQtyBefore} to ${o.combinedQtyAfter} ${o.unit}, crossing into ${o.newTierLabel} at ${o.priceAfter}/unit and unlocking ${fmtR(o.savings)} in savings versus ${o.currentTierLabel}.`;
        }
        const { explanationPromptFacts: _drop, ...rest } = o;
        return { ...rest, explanation };
      }),
    );

    return jsonResponse({ opportunities: explained });
  } catch (e) {
    if (e instanceof AiUnavailableError) {
      return jsonResponse({ error: "Couldn't reach the AI explanation service right now. Try again in a moment." }, 503);
    }
    console.error(e);
    return jsonResponse({ error: "Unexpected error." }, 500);
  }
});
