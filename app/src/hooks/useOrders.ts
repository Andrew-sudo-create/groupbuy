import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import type { Tables, Enums } from "../lib/database.types";

export type Order = Tables<"orders">;
export type OrderStatus = Enums<"order_status">;

export const ORDER_STATUS_SEQUENCE: OrderStatus[] = [
  "draft",
  "pending_approval",
  "group_forming",
  "confirmed",
  "processing",
  "completed",
];

export function useOrder(poolId: string | null | undefined, supplierId: string | null | undefined) {
  return useQuery({
    queryKey: ["order", poolId, supplierId],
    queryFn: async (): Promise<Order | null> => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("pool_id", poolId!)
        .eq("supplier_id", supplierId!)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!poolId && !!supplierId,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>, poolId: string, supplierId: string) {
  qc.invalidateQueries({ queryKey: ["order", poolId, supplierId] });
}

export function useStartOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      poolId: string;
      supplierId: string;
      createdBy: string;
      totalUnits: number;
      totalSpend: number;
      totalSavings: number;
    }) => {
      const transactionFee = Math.round(args.totalSpend * 0.02 * 100) / 100;
      const { error } = await supabase.from("orders").insert({
        pool_id: args.poolId,
        supplier_id: args.supplierId,
        created_by: args.createdBy,
        total_units: args.totalUnits,
        total_spend: args.totalSpend,
        total_savings: args.totalSavings,
        transaction_fee: transactionFee,
        status: "draft",
      });
      if (error) throw error;
    },
    onSuccess: (_d, { poolId, supplierId }) => invalidate(qc, poolId, supplierId),
  });
}

export function useAdvanceOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus; poolId: string; supplierId: string }) => {
      const patch: { status: OrderStatus; confirmed_at?: string } = { status };
      if (status === "confirmed") patch.confirmed_at = new Date().toISOString();
      const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: (_d, { poolId, supplierId }) => invalidate(qc, poolId, supplierId),
  });
}

export function useSimulatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId }: { orderId: string; poolId: string; supplierId: string }) => {
      const { error } = await supabase.from("orders").update({ payment_status: "simulated_paid" }).eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: (_d, { poolId, supplierId }) => invalidate(qc, poolId, supplierId),
  });
}
