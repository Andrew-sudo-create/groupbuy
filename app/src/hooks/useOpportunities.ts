import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import { fetchGroupOpportunities, type Opportunity } from "../lib/ai";

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
