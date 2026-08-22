import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import { computeItemVM, computeSummaryStats, type SummaryStats } from "../lib/domain";

export function useOrderSummary(poolId: string | null | undefined, supplierId: string | null | undefined) {
  return useQuery({
    queryKey: ["orderSummary", poolId, supplierId],
    queryFn: async (): Promise<SummaryStats> => {
      const { data: items, error: itemErr } = await supabase
        .from("items")
        .select("*, item_tiers(*)")
        .eq("supplier_id", supplierId!);
      if (itemErr) throw itemErr;

      const { data: totalsRows, error: totalsErr } = await supabase.rpc("pool_item_totals", { p_pool_id: poolId! });
      if (totalsErr) throw totalsErr;
      const totals = new Map<string, number>((totalsRows ?? []).map((r) => [r.item_id, Number(r.total_qty)]));

      const itemVMs = (items ?? []).map((it) => computeItemVM(it, it.item_tiers, totals.get(it.id) ?? 0));
      const itemIds = itemVMs.map((i) => i.id);

      let pledgeRows: { buyer_id: string; item_id: string; qty: number; buyer_profiles: { business_name: string; business_type: string } | null }[] = [];
      if (itemIds.length > 0) {
        const { data, error } = await supabase
          .from("pledges")
          .select("buyer_id, item_id, qty, buyer_profiles(business_name, business_type)")
          .eq("pool_id", poolId!)
          .in("item_id", itemIds);
        if (error) throw error;
        pledgeRows = (data ?? []) as unknown as typeof pledgeRows;
      }

      const pledgesForStats = pledgeRows.map((r) => ({
        buyer_id: r.buyer_id,
        item_id: r.item_id,
        qty: r.qty,
        buyerName: r.buyer_profiles?.business_name ?? "Unknown",
        buyerType: r.buyer_profiles?.business_type ?? "",
      }));

      return computeSummaryStats(itemVMs, pledgesForStats);
    },
    enabled: !!poolId && !!supplierId,
    // Live-poll like the catalog hooks so this screen (often the one on a
    // projector during a presentation) updates on its own.
    refetchInterval: 4000,
  });
}

/** Suppliers actively linked to a pool — used to build the buyer-facing "choose a supplier" grid. */
export function useActiveSuppliersForPool(poolId: string | null | undefined) {
  return useQuery({
    queryKey: ["activeSuppliersForPool", poolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_pool_links")
        .select("supplier_id, supplier_profiles(id, company_name)")
        .eq("pool_id", poolId!)
        .eq("status", "active");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.supplier_id,
        companyName: (r.supplier_profiles as unknown as { company_name: string } | null)?.company_name ?? "Unknown supplier",
      }));
    },
    enabled: !!poolId,
  });
}
