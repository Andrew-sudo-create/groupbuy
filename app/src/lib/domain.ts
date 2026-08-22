// Pure view-model math, ported from the wireframe's getEffectiveCatalogVM /
// computeSummaryStats (GroupBuy B2B.dc.html). Kept framework-free so it's easy
// to unit-test and reuse between the buyer dashboard, supplier portal and the
// order-summary screens.

export interface TierRow {
  id: string;
  tier_index: number;
  threshold: number;
  price: number;
}

export interface ItemRow {
  id: string;
  supplier_id: string;
  name: string;
  unit: string;
  base_price: number;
}

export interface ItemVM {
  id: string;
  supplierId: string;
  name: string;
  unit: string;
  basePrice: number;
  tiers: TierRow[];
  totalPledged: number;
  achievedIdx: number;
  currentPrice: number;
  nextTier: TierRow | null;
  fillPct: number;
  ticks: { pct: number }[];
  tierLabel: string;
}

export function fmtR(n: number): string {
  const hasDecimals = n % 1 !== 0;
  return (
    "R" +
    n.toLocaleString("en-US", {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    })
  );
}

/** Compute the tier-progress view model for one item given its pool-wide pledged total. */
export function computeItemVM(item: ItemRow, tiersRaw: TierRow[], totalPledged: number): ItemVM {
  const tiers = [...tiersRaw].sort((a, b) => a.tier_index - b.tier_index);
  let achievedIdx = -1;
  for (let i = 0; i < tiers.length; i++) {
    if (totalPledged >= tiers[i].threshold) achievedIdx = i;
  }
  const currentPrice = achievedIdx >= 0 ? tiers[achievedIdx].price : item.base_price;
  const nextTier = achievedIdx + 1 < tiers.length ? tiers[achievedIdx + 1] : null;
  const maxThreshold = tiers.length > 0 ? tiers[tiers.length - 1].threshold : 1;
  const fillPct = Math.min(100, (totalPledged / maxThreshold) * 100);
  const ticks = tiers.slice(0, -1).map((t) => ({ pct: (t.threshold / maxThreshold) * 100 }));
  const tierLabel = achievedIdx < 0 ? "Base price" : `Tier ${achievedIdx + 1}`;
  return {
    id: item.id,
    supplierId: item.supplier_id,
    name: item.name,
    unit: item.unit,
    basePrice: item.base_price,
    tiers,
    totalPledged,
    achievedIdx,
    currentPrice,
    nextTier,
    fillPct,
    ticks,
    tierLabel,
  };
}

export interface BuyerAgg {
  id: string;
  name: string;
  type: string;
  units: number;
  spend: number;
  savings: number;
}

export interface SummaryStats {
  perItem: ItemVM[];
  perBuyer: BuyerAgg[];
  totalUnits: number;
  totalSpend: number;
  totalSavings: number;
}

export function computeSummaryStats(
  items: ItemVM[],
  pledges: { buyer_id: string; item_id: string; qty: number; buyerName: string; buyerType: string }[],
): SummaryStats {
  const buyerMap = new Map<string, BuyerAgg>();
  for (const p of pledges) {
    const item = items.find((i) => i.id === p.item_id);
    if (!item) continue;
    const entry = buyerMap.get(p.buyer_id) ?? {
      id: p.buyer_id,
      name: p.buyerName,
      type: p.buyerType,
      units: 0,
      spend: 0,
      savings: 0,
    };
    entry.units += p.qty;
    entry.spend += p.qty * item.currentPrice;
    entry.savings += p.qty * (item.basePrice - item.currentPrice);
    buyerMap.set(p.buyer_id, entry);
  }
  const perBuyer = [...buyerMap.values()].filter((b) => b.units > 0);
  const totalUnits = items.reduce((s, i) => s + i.totalPledged, 0);
  const totalSpend = items.reduce((s, i) => s + i.totalPledged * i.currentPrice, 0);
  const totalBase = items.reduce((s, i) => s + i.totalPledged * i.basePrice, 0);
  return { perItem: items, perBuyer, totalUnits, totalSpend, totalSavings: totalBase - totalSpend };
}

/** Great-circle distance in km between two lat/lng points (Haversine). */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function formatCountdown(closeAt: string | Date, now: number): string {
  const remaining = Math.max(0, new Date(closeAt).getTime() - now);
  const s = Math.floor(remaining / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${d}d ${h}h ${m}m ${sec}s`;
}
