import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import type { Tables } from "../lib/database.types";

export type PurchaseRequest = Tables<"purchase_requests">;

export function useMyPurchaseRequests(buyerId: string | null | undefined) {
  return useQuery({
    queryKey: ["purchaseRequests", buyerId],
    queryFn: async (): Promise<PurchaseRequest[]> => {
      const { data, error } = await supabase
        .from("purchase_requests")
        .select("*")
        .eq("buyer_id", buyerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!buyerId,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>, buyerId: string) {
  qc.invalidateQueries({ queryKey: ["purchaseRequests", buyerId] });
  qc.invalidateQueries({ queryKey: ["buyerOpportunities", buyerId] });
}

export interface PurchaseRequestInput {
  productName: string;
  quantity: number;
  unit: string;
  neededBy: string | null;
  radiusKm: number | null;
  budgetPrice: number | null;
  notes: string;
}

export function useCreatePurchaseRequest(buyerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PurchaseRequestInput) => {
      const { error } = await supabase.from("purchase_requests").insert({
        buyer_id: buyerId,
        product_name: input.productName,
        quantity: input.quantity,
        unit: input.unit,
        needed_by: input.neededBy,
        radius_km: input.radiusKm,
        budget_price: input.budgetPrice,
        notes: input.notes,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc, buyerId),
  });
}

export function useUpdatePurchaseRequest(buyerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: PurchaseRequestInput }) => {
      const { error } = await supabase
        .from("purchase_requests")
        .update({
          product_name: input.productName,
          quantity: input.quantity,
          unit: input.unit,
          needed_by: input.neededBy,
          radius_km: input.radiusKm,
          budget_price: input.budgetPrice,
          notes: input.notes,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc, buyerId),
  });
}

export function useCancelPurchaseRequest(buyerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("purchase_requests").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc, buyerId),
  });
}
