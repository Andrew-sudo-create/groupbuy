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

export interface OpportunityPool {
  poolId: string;
  poolName: string;
  deliveryLocation: string;
  addedQty: number;
  buyerCount: number;
  linkStatus: "none" | "pending";
}

export interface Opportunity {
  itemId: string;
  itemName: string;
  unit: string;
  currentTierLabel: string;
  newTierLabel: string;
  priceBefore: string;
  priceAfter: string;
  combinedQtyBefore: number;
  combinedQtyAfter: number;
  thresholdNeeded: number;
  savings: number;
  pools: OpportunityPool[];
  riskFlags: string[];
  explanation: string;
}

export function fetchGroupOpportunities() {
  return invoke<{ opportunities: Opportunity[] }>("ai-group-opportunities", {});
}

export interface MatchedBuyer {
  buyerId: string;
  businessName: string;
  businessType: string;
  quantity: number;
  distanceKm: number | null;
}

export interface MatchedItem {
  itemId: string;
  supplierId: string;
  supplierName: string;
  unit: string;
  individualPrice: string;
  groupPrice: string;
  tierLabel: string;
}

export interface BuyerOpportunity {
  requestId: string;
  productName: string;
  myQuantity: number;
  unit: string;
  matchedBuyers: MatchedBuyer[];
  combinedQuantity: number;
  matchedItem: MatchedItem | null;
  canJoinDirectly: boolean;
  isPoolAdmin: boolean;
  savingsPerMe: number;
  savingsTotal: number;
  riskFlags: string[];
  explanation: string;
}

export function fetchBuyerOpportunities() {
  return invoke<{ opportunities: BuyerOpportunity[] }>("ai-buyer-opportunities", {});
}
