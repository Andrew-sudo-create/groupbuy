import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";

export function useSettings(buyerId: string | null | undefined) {
  return useQuery({
    queryKey: ["settings", buyerId],
    queryFn: async () => {
      const { data, error } = await supabase.from("settings").select("*").eq("buyer_id", buyerId!).maybeSingle();
      if (error) throw error;
      return (
        data ?? {
          buyer_id: buyerId!,
          email_on_unlock: true,
          reminder_before_close: true,
          ai_suggestions: true,
        }
      );
    },
    enabled: !!buyerId,
  });
}

export function useToggleSetting(buyerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: "email_on_unlock" | "reminder_before_close" | "ai_suggestions"; value: boolean }) => {
      const { error } =
        key === "email_on_unlock"
          ? await supabase.from("settings").upsert({ buyer_id: buyerId, email_on_unlock: value })
          : key === "reminder_before_close"
            ? await supabase.from("settings").upsert({ buyer_id: buyerId, reminder_before_close: value })
            : await supabase.from("settings").upsert({ buyer_id: buyerId, ai_suggestions: value });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings", buyerId] }),
  });
}
