import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";

export function useMyPledges(buyerId: string | null | undefined) {
  return useQuery({
    queryKey: ["myPledges", buyerId],
    queryFn: async () => {
      const { data, error } = await supabase.from("pledges").select("*").eq("buyer_id", buyerId!);
      if (error) throw error;
      return data;
    },
    enabled: !!buyerId,
  });
}

function invalidatePledges(qc: ReturnType<typeof useQueryClient>, buyerId: string, poolId: string) {
  qc.invalidateQueries({ queryKey: ["myPledges", buyerId] });
  qc.invalidateQueries({ queryKey: ["catalog", poolId] });
  qc.invalidateQueries({ queryKey: ["orderSummary"] });
}

export function useJoinOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      buyerId,
      poolId,
      itemId,
      qty,
    }: {
      buyerId: string;
      poolId: string;
      itemId: string;
      qty: number;
    }) => {
      if (qty <= 0) {
        const { error } = await supabase.from("pledges").delete().eq("buyer_id", buyerId).eq("item_id", itemId);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("pledges")
        .upsert({ buyer_id: buyerId, pool_id: poolId, item_id: itemId, qty }, { onConflict: "buyer_id,item_id" });
      if (error) throw error;
    },
    onSuccess: (_d, { buyerId, poolId }) => invalidatePledges(qc, buyerId, poolId),
  });
}

export function useRemovePledge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ buyerId, itemId }: { buyerId: string; itemId: string; poolId: string }) => {
      const { error } = await supabase.from("pledges").delete().eq("buyer_id", buyerId).eq("item_id", itemId);
      if (error) throw error;
    },
    onSuccess: (_d, { buyerId, poolId }) => invalidatePledges(qc, buyerId, poolId),
  });
}
