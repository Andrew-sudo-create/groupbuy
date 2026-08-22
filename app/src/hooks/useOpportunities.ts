import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import { fetchGroupOpportunities, fetchBuyerOpportunities, type Opportunity, type BuyerOpportunity } from "../lib/ai";

export function useGroupOpportunities(supplierId: string | null | undefined) {
  return useQuery({
    queryKey: ["groupOpportunities", supplierId],
    queryFn: async () => (await fetchGroupOpportunities()).opportunities,
    enabled: !!supplierId,
    staleTime: 60_000,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>, supplierId: string) {
  qc.invalidateQueries({ queryKey: ["groupOpportunities", supplierId] });
  qc.invalidateQueries({ queryKey: ["poolLinks"] });
  qc.invalidateQueries({ queryKey: ["supplierLinks", supplierId] });
}

/** Human approval: sends a real "request to join" to every not-yet-linked pool
 * in the recommendation, and records the decision so it's remembered. */
export function useApproveOpportunity(supplierId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (opp: Opportunity) => {
      const toRequest = opp.pools.filter((p) => p.linkStatus === "none");
      if (toRequest.length > 0) {
        const { error } = await supabase.from("supplier_pool_links").insert(
          toRequest.map((p) => ({ pool_id: p.poolId, supplier_id: supplierId, status: "pending" as const, initiated_by: "supplier" as const })),
        );
        if (error) throw error;
      }
      const { error: fbError } = await supabase.from("ai_recommendation_feedback").insert({
        supplier_id: supplierId,
        item_id: opp.itemId,
        pool_ids: opp.pools.map((p) => p.poolId),
        status: "approved",
      });
      if (fbError) throw fbError;
    },
    onSuccess: () => invalidate(qc, supplierId),
  });
}

/** Human rejection: remembers this exact item + pool combination so it stops
 * being suggested. */
export function useDismissOpportunity(supplierId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (opp: Opportunity) => {
      const { error } = await supabase.from("ai_recommendation_feedback").insert({
        supplier_id: supplierId,
        item_id: opp.itemId,
        pool_ids: opp.pools.map((p) => p.poolId),
        status: "dismissed",
      });
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc, supplierId),
  });
}

// ---- Buyer-facing GroupBuy Opportunities (matches on this buyer's own Purchase Requests) ----

export function useBuyerOpportunities(buyerId: string | null | undefined) {
  return useQuery({
    queryKey: ["buyerOpportunities", buyerId],
    queryFn: async () => (await fetchBuyerOpportunities()).opportunities,
    enabled: !!buyerId,
    staleTime: 60_000,
  });
}

function invalidateBuyer(qc: ReturnType<typeof useQueryClient>, buyerId: string, poolId: string | null) {
  qc.invalidateQueries({ queryKey: ["buyerOpportunities", buyerId] });
  qc.invalidateQueries({ queryKey: ["purchaseRequests", buyerId] });
  qc.invalidateQueries({ queryKey: ["myPledges", buyerId] });
  if (poolId) qc.invalidateQueries({ queryKey: ["catalog", poolId] });
}

/** Human approval on the buyer side. Three real outcomes depending on what's
 * actually possible under RLS — never a fake success:
 *  - the matched item's supplier is already active in my pool -> pledge my
 *    requested quantity directly.
 *  - it isn't, but I'm the pool admin -> send a real invite to that supplier.
 *  - it isn't, and I'm not the admin -> nothing I can do myself (the UI
 *    disables the button and explains why before this is ever called). */
export function useApproveBuyerOpportunity(buyerId: string, poolId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (opp: BuyerOpportunity) => {
      if (opp.matchedItem && opp.canJoinDirectly && poolId) {
        const { error } = await supabase
          .from("pledges")
          .upsert(
            { buyer_id: buyerId, pool_id: poolId, item_id: opp.matchedItem.itemId, qty: opp.myQuantity },
            { onConflict: "buyer_id,item_id" },
          );
        if (error) throw error;
        const { error: reqError } = await supabase
          .from("purchase_requests")
          .update({ status: "matched", matched_item_id: opp.matchedItem.itemId })
          .eq("id", opp.requestId);
        if (reqError) throw reqError;
      } else if (opp.matchedItem && opp.isPoolAdmin && poolId) {
        const { error } = await supabase
          .from("supplier_pool_links")
          .insert({ pool_id: poolId, supplier_id: opp.matchedItem.supplierId, status: "pending", initiated_by: "pool_admin" });
        if (error) throw error;
      }
      const { error: fbError } = await supabase.from("purchase_request_feedback").insert({
        buyer_id: buyerId,
        purchase_request_id: opp.requestId,
        matched_buyer_ids: opp.matchedBuyers.map((b) => b.buyerId),
        status: "approved",
      });
      if (fbError) throw fbError;
    },
    onSuccess: () => invalidateBuyer(qc, buyerId, poolId),
  });
}

export function useDismissBuyerOpportunity(buyerId: string, poolId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (opp: BuyerOpportunity) => {
      const { error } = await supabase.from("purchase_request_feedback").insert({
        buyer_id: buyerId,
        purchase_request_id: opp.requestId,
        matched_buyer_ids: opp.matchedBuyers.map((b) => b.buyerId),
        status: "dismissed",
      });
      if (error) throw error;
    },
    onSuccess: () => invalidateBuyer(qc, buyerId, poolId),
  });
}
