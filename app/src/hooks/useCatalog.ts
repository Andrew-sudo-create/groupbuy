import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import { computeItemVM, type ItemVM } from "../lib/domain";

async function fetchTotals(poolId: string) {
  const { data, error } = await supabase.rpc("pool_item_totals", { p_pool_id: poolId });
  if (error) throw error;
  const map = new Map<string, number>();
  for (const row of data ?? []) map.set(row.item_id, Number(row.total_qty));
  return map;
}

/** Every item offered by suppliers actively linked to this pool, with tier-progress VM. */
export function usePoolCatalog(poolId: string | null | undefined) {
  return useQuery({
    queryKey: ["catalog", poolId],
    queryFn: async (): Promise<ItemVM[]> => {
      const { data: links, error: linkErr } = await supabase
        .from("supplier_pool_links")
        .select("supplier_id")
        .eq("pool_id", poolId!)
        .eq("status", "active");
      if (linkErr) throw linkErr;
      const supplierIds = (links ?? []).map((l) => l.supplier_id);
      if (supplierIds.length === 0) return [];

      const { data: items, error: itemErr } = await supabase
        .from("items")
        .select("*, item_tiers(*)")
        .in("supplier_id", supplierIds);
      if (itemErr) throw itemErr;

      const totals = await fetchTotals(poolId!);
      return (items ?? []).map((it) => computeItemVM(it, it.item_tiers, totals.get(it.id) ?? 0));
    },
    enabled: !!poolId,
    // Short poll so a live-presentation audience sees pledges/tier-fills from
    // OTHER buyers land without anyone needing to manually refresh — this is
    // the buyer dashboard, the screen most likely to be watched live.
    refetchInterval: 4000,
  });
}

/** A supplier's own catalog (independent of any one pool). */
export function useSupplierItems(supplierId: string | null | undefined) {
  return useQuery({
    queryKey: ["supplierItems", supplierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("*, item_tiers(*)")
        .eq("supplier_id", supplierId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!supplierId,
  });
}

/** Same items as useSupplierItems, but with tier-progress computed for one pool. */
export function useSupplierItemsInPool(supplierId: string | null | undefined, poolId: string | null | undefined) {
  return useQuery({
    queryKey: ["supplierItemsInPool", supplierId, poolId],
    queryFn: async (): Promise<ItemVM[]> => {
      const { data: items, error } = await supabase
        .from("items")
        .select("*, item_tiers(*)")
        .eq("supplier_id", supplierId!)
        .order("created_at");
      if (error) throw error;
      const totals = await fetchTotals(poolId!);
      return (items ?? []).map((it) => computeItemVM(it, it.item_tiers, totals.get(it.id) ?? 0));
    },
    enabled: !!supplierId && !!poolId,
    // Same live-poll as usePoolCatalog — this is the supplier's projector view
    // during a presentation.
    refetchInterval: 4000,
  });
}

export interface NewItemInput {
  supplierId: string;
  name: string;
  unit: string;
  basePrice: number;
  tiers: { threshold: number; price: number }[];
}

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewItemInput) => {
      const { data: item, error: itemErr } = await supabase
        .from("items")
        .insert({ supplier_id: input.supplierId, name: input.name, unit: input.unit, base_price: input.basePrice })
        .select()
        .single();
      if (itemErr) throw itemErr;

      const tierRows = input.tiers.map((t, i) => ({
        item_id: item.id,
        tier_index: i + 1,
        threshold: t.threshold,
        price: t.price,
      }));
      const { error: tierErr } = await supabase.from("item_tiers").insert(tierRows);
      if (tierErr) throw tierErr;
      return item;
    },
    onSuccess: (_d, input) => {
      qc.invalidateQueries({ queryKey: ["supplierItems", input.supplierId] });
      qc.invalidateQueries({ queryKey: ["supplierItemsInPool"] });
      qc.invalidateQueries({ queryKey: ["catalog"] });
    },
  });
}

export function useUpdateTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tierId,
      field,
      value,
    }: {
      tierId: string;
      field: "threshold" | "price";
      value: number;
      supplierId: string;
    }) => {
      const patch: { threshold?: number; price?: number } = field === "threshold" ? { threshold: value } : { price: value };
      const { error } = await supabase.from("item_tiers").update(patch).eq("id", tierId);
      if (error) throw error;
    },
    onSuccess: (_d, { supplierId }) => {
      qc.invalidateQueries({ queryKey: ["supplierItems", supplierId] });
      qc.invalidateQueries({ queryKey: ["supplierItemsInPool"] });
      qc.invalidateQueries({ queryKey: ["catalog"] });
    },
  });
}
