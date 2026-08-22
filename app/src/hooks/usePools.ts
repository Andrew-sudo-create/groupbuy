import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";

export interface PoolListItem {
  id: string;
  name: string;
  delivery_location: string;
  admin_buyer_id: string | null;
  window_close_at: string;
  lat: number | null;
  lng: number | null;
  buyerCount: number;
}

export function useAllPools() {
  return useQuery({
    queryKey: ["pools"],
    queryFn: async (): Promise<PoolListItem[]> => {
      const [{ data: pools, error: poolErr }, { data: buyers, error: buyerErr }] = await Promise.all([
        supabase.from("pools").select("*").order("name"),
        supabase.from("buyer_profiles").select("pool_id"),
      ]);
      if (poolErr) throw poolErr;
      if (buyerErr) throw buyerErr;
      const counts = new Map<string, number>();
      for (const b of buyers ?? []) {
        if (!b.pool_id) continue;
        counts.set(b.pool_id, (counts.get(b.pool_id) ?? 0) + 1);
      }
      return (pools ?? []).map((p) => ({ ...p, buyerCount: counts.get(p.id) ?? 0 }));
    },
  });
}

export function usePool(poolId: string | null | undefined) {
  return useQuery({
    queryKey: ["pool", poolId],
    queryFn: async () => {
      const { data, error } = await supabase.from("pools").select("*").eq("id", poolId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!poolId,
  });
}

export function useCreatePool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, adminBuyerId }: { name: string; adminBuyerId: string }) => {
      const { data, error } = await supabase
        .from("pools")
        .insert({ name, admin_buyer_id: adminBuyerId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pools"] }),
  });
}

export function useUpdatePoolDeliveryLocation(poolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (delivery_location: string) => {
      const { error } = await supabase.from("pools").update({ delivery_location }).eq("id", poolId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pool", poolId] });
      qc.invalidateQueries({ queryKey: ["pools"] });
    },
  });
}

export function usePoolMembers(poolId: string | null | undefined) {
  return useQuery({
    queryKey: ["poolMembers", poolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("buyer_profiles")
        .select("id, business_name, business_type")
        .eq("pool_id", poolId!);
      if (error) throw error;
      return data;
    },
    enabled: !!poolId,
  });
}
