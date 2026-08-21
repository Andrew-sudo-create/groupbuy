import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";

export interface LinkWithPool {
  id: string;
  pool_id: string;
  supplier_id: string;
  status: "pending" | "active" | "declined";
  initiated_by: "pool_admin" | "supplier";
  pool_name: string;
}

export interface LinkWithSupplier {
  id: string;
  pool_id: string;
  supplier_id: string;
  status: "pending" | "active" | "declined";
  initiated_by: "pool_admin" | "supplier";
  company_name: string;
}

/** All links for a supplier (their view of every pool they're linked/pending/declined with). */
export function useSupplierLinks(supplierId: string | null | undefined) {
  return useQuery({
    queryKey: ["supplierLinks", supplierId],
    queryFn: async (): Promise<LinkWithPool[]> => {
      const { data, error } = await supabase
        .from("supplier_pool_links")
        .select("id, pool_id, supplier_id, status, initiated_by, pools(name)")
        .eq("supplier_id", supplierId!);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        pool_id: r.pool_id,
        supplier_id: r.supplier_id,
        status: r.status,
        initiated_by: r.initiated_by,
        pool_name: (r.pools as unknown as { name: string } | null)?.name ?? "Unknown pool",
      }));
    },
    enabled: !!supplierId,
  });
}

/** All links for one pool (the pool admin's view of suppliers linked/pending/declined). */
export function usePoolLinks(poolId: string | null | undefined) {
  return useQuery({
    queryKey: ["poolLinks", poolId],
    queryFn: async (): Promise<LinkWithSupplier[]> => {
      const { data, error } = await supabase
        .from("supplier_pool_links")
        .select("id, pool_id, supplier_id, status, initiated_by, supplier_profiles(company_name)")
        .eq("pool_id", poolId!);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        pool_id: r.pool_id,
        supplier_id: r.supplier_id,
        status: r.status,
        initiated_by: r.initiated_by,
        company_name: (r.supplier_profiles as unknown as { company_name: string } | null)?.company_name ?? "Unknown supplier",
      }));
    },
    enabled: !!poolId,
  });
}

export function useAllSuppliers() {
  return useQuery({
    queryKey: ["allSuppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("supplier_profiles").select("id, company_name").order("company_name");
      if (error) throw error;
      return data;
    },
  });
}

function invalidateLinks(qc: ReturnType<typeof useQueryClient>, poolId: string, supplierId: string) {
  qc.invalidateQueries({ queryKey: ["poolLinks", poolId] });
  qc.invalidateQueries({ queryKey: ["supplierLinks", supplierId] });
  qc.invalidateQueries({ queryKey: ["catalog", poolId] });
}

export function useRequestJoinPool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ poolId, supplierId }: { poolId: string; supplierId: string }) => {
      const { error } = await supabase
        .from("supplier_pool_links")
        .insert({ pool_id: poolId, supplier_id: supplierId, status: "pending", initiated_by: "supplier" });
      if (error) throw error;
    },
    onSuccess: (_d, { poolId, supplierId }) => invalidateLinks(qc, poolId, supplierId),
  });
}

export function useInviteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ poolId, supplierId }: { poolId: string; supplierId: string }) => {
      const { error } = await supabase
        .from("supplier_pool_links")
        .insert({ pool_id: poolId, supplier_id: supplierId, status: "pending", initiated_by: "pool_admin" });
      if (error) throw error;
    },
    onSuccess: (_d, { poolId, supplierId }) => invalidateLinks(qc, poolId, supplierId),
  });
}

export function useRespondToLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      linkId,
      accept,
    }: {
      linkId: string;
      poolId: string;
      supplierId: string;
      accept: boolean;
    }) => {
      const { error } = await supabase
        .from("supplier_pool_links")
        .update({ status: accept ? "active" : "declined", responded_at: new Date().toISOString() })
        .eq("id", linkId);
      if (error) throw error;
    },
    onSuccess: (_d, { poolId, supplierId }) => invalidateLinks(qc, poolId, supplierId),
  });
}
