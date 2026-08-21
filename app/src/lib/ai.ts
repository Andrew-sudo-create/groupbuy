import { supabase } from "./supabaseClient";

export class AiError extends Error {}

async function invoke<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T & { error?: string }>(fn, { body });
  if (error) {
    // supabase-js surfaces non-2xx responses as a generic FunctionsHttpError;
    // the JSON body (with our own { error } message) is on error.context.
    let message = error.message;
    try {
      const ctx = (error as unknown as { context?: Response }).context;
      if (ctx) {
        const parsed = await ctx.clone().json();
        if (parsed?.error) message = parsed.error;
      }
    } catch {
      // ignore parse failures, fall back to the generic message
    }
    throw new AiError(message);
  }
  if (data && "error" in data && data.error) {
    throw new AiError(data.error);
  }
  return data as T;
}

export interface PledgeSuggestion {
  itemId: string;
  itemName: string;
  quantity: number;
  rationale: string;
}

export function suggestPledge(description: string) {
  return invoke<PledgeSuggestion>("ai-pledge-suggestion", { description });
}

export interface DemandProfile {
  demandProfile: string;
  poolMatchReason: string;
}

export function fetchDemandProfile() {
  return invoke<DemandProfile>("ai-demand-profile", {});
}

export function generateOrderNarrative(poolId: string, supplierId: string) {
  return invoke<{ narrative: string }>("ai-order-narrative", { poolId, supplierId });
}
