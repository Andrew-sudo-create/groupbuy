// AI GroupBuy Opportunity Finder — buyer-facing.
//
// For each of the calling buyer's own active Purchase Requests, finds OTHER
// buyers with a compatible active request (same/similar product, within the
// requester's preferred radius when both sides have coordinates, otherwise
// same pool as a fallback) via the matching_purchase_requests RPC — which
// deliberately returns aggregate/contact-level fields only, never the other
// buyer's budget_price. Combines the quantities, finds the best-priced
// matching catalog item across every supplier, and computes what this buyer
// would pay alone vs. as part of the group. Gemini only narrates the
// already-computed numbers.

import { corsHeaders, jsonResponse } from "./_shared/cors.ts";
import { userClient, fmtR } from "./_shared/supabaseClient.ts";
import { completeText, AiUnavailableError } from "./_shared/ai.ts";

interface Tier {
  tier_index: number;
  threshold: number;
  price: number;
}

function tierPrice(tiers: Tier[], basePrice: number, total: number): { idx: number; price: number } {
  const sorted = [...tiers].sort((a, b) => a.tier_index - b.tier_index);
  let idx = -1;
  for (let i = 0; i < sorted.length; i++) {
    if (total >= sorted[i].threshold) idx = i;
  }
  return { idx, price: idx >= 0 ? Number(sorted[idx].price) : basePrice };
}

function tierLabel(idx: number): string {
  return idx < 0 ? "Base price" : `Tier ${idx + 1}`;
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = userClient(req);
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return jsonResponse({ error: "Not signed in." }, 401);

    const { data: buyer, error: buyerErr } = await supabase
      .from("buyer_profiles")
      .select("id, pool_id, lat, lng")
      .eq("id", user.id)
      .single();
    if (buyerErr || !buyer) return jsonResponse({ error: "Only buyers can use the opportunity finder." }, 403);
    if (!buyer.pool_id) return jsonResponse({ opportunities: [] });

    const [{ data: requests }, { data: pool }, { data: links }, { data: feedback }, { data: items }] = await Promise.all([
      supabase.from("purchase_requests").select("*").eq("buyer_id", user.id).eq("status", "active").order("created_at", { ascending: false }).limit(10),
      supabase.from("pools").select("id, admin_buyer_id").eq("id", buyer.pool_id).single(),
      supabase.from("supplier_pool_links").select("supplier_id, status").eq("pool_id", buyer.pool_id),
      supabase.from("purchase_request_feedback").select("purchase_request_id, matched_buyer_ids, status").eq("buyer_id", user.id),
      supabase.from("items").select("id, name, unit, base_price, supplier_id, supplier_profiles(company_name), item_tiers(tier_index, threshold, price)"),
    ]);

    if (!requests || requests.length === 0) return jsonResponse({ opportunities: [] });

    const isPoolAdmin = pool?.admin_buyer_id === user.id;
    const activeSupplierIds = new Set((links ?? []).filter((l) => l.status === "active").map((l) => l.supplier_id));
    const dismissedKeys = new Set(
      (feedback ?? []).filter((f) => f.status === "dismissed").map((f) => `${f.purchase_request_id}:${[...f.matched_buyer_ids].sort().join(",")}`),
    );

    type Opp = {
      requestId: string;
      productName: string;
      myQuantity: number;
      unit: string;
      matchedBuyers: { buyerId: string; businessName: string; businessType: string; quantity: number; distanceKm: number | null }[];
      combinedQuantity: number;
      matchedItem: { itemId: string; supplierId: string; supplierName: string; unit: string; individualPrice: string; groupPrice: string; tierLabel: string } | null;
      canJoinDirectly: boolean;
      isPoolAdmin: boolean;
      savingsPerMe: number;
      savingsTotal: number;
      riskFlags: string[];
      factLines: string;
    };

    const raw: Opp[] = [];
    const allMatchedBuyerIds = new Set<string>();
    const perRequestCandidates = new Map<string, { buyer_id: string; quantity: number; radius_km: number | null; pool_id: string; lat: number | null; lng: number | null }[]>();

    for (const r of requests) {
      const { data: candidates } = await supabase.rpc("matching_purchase_requests", { p_product_name: r.product_name, p_buyer_id: user.id });
      perRequestCandidates.set(r.id, candidates ?? []);
      for (const c of candidates ?? []) allMatchedBuyerIds.add(c.buyer_id);
    }

    const { data: matchedProfiles } = allMatchedBuyerIds.size
      ? await supabase.from("buyer_profiles").select("id, business_name, business_type").in("id", [...allMatchedBuyerIds])
      : { data: [] as { id: string; business_name: string; business_type: string }[] };
    const profileById = new Map((matchedProfiles ?? []).map((p) => [p.id, p]));

    for (const r of requests) {
      const candidates = perRequestCandidates.get(r.id) ?? [];
      const included = candidates
        .map((c) => {
          let dist: number | null = null;
          let ok: boolean;
          const maxRadius = r.radius_km ?? c.radius_km ?? null;
          if (buyer.lat != null && buyer.lng != null && c.lat != null && c.lng != null && maxRadius != null) {
            dist = distanceKm(buyer.lat, buyer.lng, c.lat, c.lng);
            ok = dist <= Number(maxRadius);
          } else {
            ok = c.pool_id === buyer.pool_id;
          }
          return { c, dist, ok };
        })
        .filter((x) => x.ok)
        .sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0) || b.c.quantity - a.c.quantity)
        .slice(0, 8);

      if (included.length === 0) continue;

      const key = `${r.id}:${[...included.map((x) => x.c.buyer_id)].sort().join(",")}`;
      if (dismissedKeys.has(key)) continue;

      const addedQty = included.reduce((s, x) => s + x.c.quantity, 0);
      const combinedQty = r.quantity + addedQty;

      const matches = (items ?? []).filter((it) => norm(it.name).includes(norm(r.product_name)) || norm(r.product_name).includes(norm(it.name)));
      let matchedItem: Opp["matchedItem"] = null;
      let savingsPerMe = 0;
      let savingsTotal = 0;
      let best: { groupPrice: number; individualPrice: number; item: (typeof matches)[number]; groupIdx: number } | null = null;
      for (const it of matches) {
        const tiers = it.item_tiers ?? [];
        const individual = tierPrice(tiers, Number(it.base_price), r.quantity);
        const group = tierPrice(tiers, Number(it.base_price), combinedQty);
        if (!best || group.price < best.groupPrice) {
          best = { groupPrice: group.price, individualPrice: individual.price, item: it, groupIdx: group.idx };
        }
      }
      if (best) {
        matchedItem = {
          itemId: best.item.id,
          supplierId: best.item.supplier_id,
          supplierName: (best.item.supplier_profiles as unknown as { company_name?: string } | null)?.company_name ?? "Unknown supplier",
          unit: best.item.unit,
          individualPrice: fmtR(best.individualPrice),
          groupPrice: fmtR(best.groupPrice),
          tierLabel: tierLabel(best.groupIdx),
        };
        savingsPerMe = (best.individualPrice - best.groupPrice) * r.quantity;
        savingsTotal = (best.individualPrice - best.groupPrice) * combinedQty;
      }

      const canJoinDirectly = matchedItem != null && activeSupplierIds.has(matchedItem.supplierId);

      const maxContribution = Math.max(...included.map((x) => x.c.quantity));
      const riskFlags: string[] = [];
      if (addedQty > 0 && maxContribution / addedQty > 0.6 && included.length > 1) {
        riskFlags.push("Most of the matched volume comes from a single other business — the group is thinner than it looks if they drop out.");
      }

      const matchedBuyers = included.map((x) => ({
        buyerId: x.c.buyer_id,
        businessName: profileById.get(x.c.buyer_id)?.business_name ?? "Unknown business",
        businessType: profileById.get(x.c.buyer_id)?.business_type ?? "",
        quantity: x.c.quantity,
        distanceKm: x.dist != null ? Math.round(x.dist * 10) / 10 : null,
      }));

      const factLines = [
        `Buyer wants: ${r.quantity} ${r.unit} of "${r.product_name}"${r.needed_by ? `, needed by ${r.needed_by}` : ""}.`,
        `Compatible businesses found: ${matchedBuyers.map((b) => `${b.businessName} (${b.businessType}, wants ${b.quantity} ${r.unit}${b.distanceKm != null ? `, ${b.distanceKm}km away` : ""})`).join("; ")}.`,
        `Combined group quantity: ${combinedQty} ${r.unit}.`,
        matchedItem
          ? `Best matching supplier item: ${matchedItem.supplierName}, individually ${matchedItem.individualPrice}/unit vs ${matchedItem.groupPrice}/unit as this group (${matchedItem.tierLabel}) — saving this buyer ${fmtR(savingsPerMe)} on their own ${r.quantity} units.`
          : `No matching supplier catalog item found yet for this product.`,
        riskFlags.length > 0 ? `Risk to flag: ${riskFlags.join(" ")}` : "No major concentration risk detected.",
      ].join("\n");

      raw.push({
        requestId: r.id,
        productName: r.product_name,
        myQuantity: r.quantity,
        unit: r.unit,
        matchedBuyers,
        combinedQuantity: combinedQty,
        matchedItem,
        canJoinDirectly,
        isPoolAdmin,
        savingsPerMe,
        savingsTotal,
        riskFlags,
        factLines,
      });
    }

    raw.sort((a, b) => b.savingsPerMe - a.savingsPerMe || b.matchedBuyers.length - a.matchedBuyers.length);
    const top = raw.slice(0, 5);

    const explained = await Promise.all(
      top.map(async (o) => {
        const prompt = `You are explaining a group-buying match to a small business owner. Write 2-3 short, factual sentences (plain prose, no headers/bullets): (1) who they're being matched with and why, (2) what price and saving this unlocks for them specifically. Use ONLY the numbers given — never invent figures.\n\n${o.factLines}`;
        let explanation: string;
        try {
          explanation = await completeText(prompt, 220);
        } catch {
          explanation = o.matchedItem
            ? `You're matched with ${o.matchedBuyers.length} other business${o.matchedBuyers.length === 1 ? "" : "es"} also wanting ${o.productName}, bringing the combined total to ${o.combinedQuantity} ${o.unit}. That unlocks ${o.matchedItem.groupPrice}/unit from ${o.matchedItem.supplierName} instead of ${o.matchedItem.individualPrice}/unit alone — saving you ${fmtR(o.savingsPerMe)}.`
            : `You're matched with ${o.matchedBuyers.length} other business${o.matchedBuyers.length === 1 ? "" : "es"} also wanting ${o.productName}, but no supplier in the catalog carries it yet.`;
        }
        const { factLines: _drop, ...rest } = o;
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
