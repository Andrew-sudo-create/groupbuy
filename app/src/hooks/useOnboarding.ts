import { useMutation } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import type { Enums } from "../lib/database.types";
import { useAuth } from "../lib/AuthContext";

export function useCreateBuyerProfile() {
  const { refreshProfile } = useAuth();
  return useMutation({
    mutationFn: async (args: {
      userId: string;
      businessName: string;
      businessType: Enums<"business_type">;
      poolChoice: string; // existing pool id, or "__new__"
      newPoolName?: string;
    }) => {
      const { userId, businessName, businessType, poolChoice, newPoolName } = args;

      if (poolChoice === "__new__") {
        const name = (newPoolName ?? "").trim();
        if (!name) throw new Error("Pool name is required.");

        const { error: insertErr } = await supabase.from("buyer_profiles").insert({
          id: userId,
          business_name: businessName,
          business_type: businessType,
          pool_id: null,
        });
        if (insertErr) throw insertErr;

        const { data: pool, error: poolErr } = await supabase
          .from("pools")
          .insert({ name, admin_buyer_id: userId })
          .select()
          .single();
        if (poolErr) throw poolErr;

        const { error: updateErr } = await supabase
          .from("buyer_profiles")
          .update({ pool_id: pool.id })
          .eq("id", userId);
        if (updateErr) throw updateErr;
      } else {
        const { error } = await supabase.from("buyer_profiles").insert({
          id: userId,
          business_name: businessName,
          business_type: businessType,
          pool_id: poolChoice,
        });
        if (error) throw error;
      }

      await supabase.from("settings").insert({ buyer_id: userId });
    },
    onSuccess: () => refreshProfile(),
  });
}

export function useCreateSupplierProfile() {
  const { refreshProfile } = useAuth();
  return useMutation({
    mutationFn: async (args: { userId: string; companyName: string; contactEmail: string }) => {
      const { error } = await supabase.from("supplier_profiles").insert({
        id: args.userId,
        company_name: args.companyName,
        contact_email: args.contactEmail,
      });
      if (error) throw error;
    },
    onSuccess: () => refreshProfile(),
  });
}
