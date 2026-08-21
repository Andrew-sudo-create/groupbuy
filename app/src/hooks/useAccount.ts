import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import type { Enums } from "../lib/database.types";
import { useAuth } from "../lib/AuthContext";

export function useUpdateBuyerAccount() {
  const { refreshProfile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      buyerId: string;
      businessName: string;
      businessType: Enums<"business_type">;
      orderNotes: string;
    }) => {
      const { error } = await supabase
        .from("buyer_profiles")
        .update({
          business_name: args.businessName,
          business_type: args.businessType,
          order_notes: args.orderNotes,
        })
        .eq("id", args.buyerId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await refreshProfile();
      qc.invalidateQueries({ queryKey: ["poolMembers"] });
    },
  });
}
