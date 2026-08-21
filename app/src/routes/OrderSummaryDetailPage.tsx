import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Sparkles, Package, CreditCard, PiggyBank } from "lucide-react";
import { usePool } from "../hooks/usePools";
import { useOrderSummary } from "../hooks/useOrderSummary";
import { generateOrderNarrative, AiError } from "../lib/ai";
import { fmtR } from "../lib/domain";
import { StatCard, Tag } from "../components/ui";

export default function OrderSummaryDetailPage() {
  const { poolId, supplierId } = useParams<{ poolId: string; supplierId: string }>();
  const { data: pool } = usePool(poolId);
  const { data: stats, isLoading } = useOrderSummary(poolId, supplierId);

  const [narrative, setNarrative] = useState("");
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [narrativeError, setNarrativeError] = useState<string | null>(null);

  async function generate() {
    if (!poolId || !supplierId) return;
    setNarrativeLoading(true);
    setNarrativeError(null);
    try {
      const { narrative } = await generateOrderNarrative(poolId, supplierId);
      setNarrative(narrative);
    } catch (e) {
      setNarrativeError(e instanceof AiError ? e.message : "AI narrative unavailable right now — the numbers below are accurate regardless.");
    } finally {
      setNarrativeLoading(false);
    }
  }

  const dateStr = new Date().toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="max-w-[960px] mx-auto px-6 pt-8 pb-14 w-full">
      <Link to="/summary" className="inline-flex items-center gap-1.5 text-muted text-[13.5px] mb-4">
        <ArrowLeft size={14} /> All pools
      </Link>
      <div className="inline-flex items-center whitespace-nowrap border border-border-strong rounded-full px-3.5 py-1.5 text-[13px] text-accent-light mb-4.5">
        <Sparkles size={14} className="mr-1.5 flex-shrink-0" />
        AI-drafted — ready to review
      </div>

      <div className="bg-surface border border-border rounded-2xl p-9">
        <div className="text-faint text-xs uppercase tracking-wide">{pool?.name ?? "…"} pool</div>
        <h2 className="text-[26px] font-bold mt-1 mb-1.5 tracking-tight">Order Summary</h2>
        <p className="text-muted text-[13.5px] m-0 mb-1">
          {dateStr} · compiled from {stats?.perBuyer.length ?? 0} buyers across{" "}
          {stats?.perItem.filter((i) => i.totalPledged > 0).length ?? 0} items
        </p>
        <p className="flex items-center gap-1.5 text-muted text-[13px] m-0 mb-5">
          Deliver to {pool?.delivery_location || "TBD"}
        </p>

        {narrativeLoading && <p className="text-muted italic text-sm">Drafting the summary…</p>}
        {!narrativeLoading && (
          <>
            {narrative && <p className="text-[15px] leading-relaxed text-text-strong">{narrative}</p>}
            {narrativeError && <p className="text-error text-[13px]">{narrativeError}</p>}
            <button
              onClick={generate}
              className="whitespace-nowrap px-4 py-2 rounded-lg border border-border-strong bg-transparent text-text font-medium text-[13.5px] cursor-pointer hover:bg-surface-2 font-sans"
            >
              {narrative ? "Regenerate" : "Draft the summary"}
            </button>
          </>
        )}

        <div className="border-t border-border my-6" />

        <div className="grid grid-cols-3 gap-4 mb-7">
          <StatCard dark icon={<Package size={13} />} label="Total units" value={String(stats?.totalUnits ?? 0)} />
          <StatCard dark icon={<CreditCard size={13} />} label="Total spend" value={fmtR(stats?.totalSpend ?? 0)} />
          <StatCard dark icon={<PiggyBank size={13} />} label="Total saved vs base" value={fmtR(stats?.totalSavings ?? 0)} />
        </div>

        {isLoading && <p className="text-faint text-sm">Loading…</p>}

        <h5 className="text-sm font-semibold mb-3">By item</h5>
        <div className="overflow-x-auto mb-7">
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr>
                {["Item", "Units", "Tier", "Price", "Savings"].map((h) => (
                  <th key={h} className="text-left py-2.5 text-[11px] uppercase tracking-wide text-faint border-b border-border">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats?.perItem.map((item) => (
                <tr key={item.id}>
                  <td className="py-2.5 border-b border-divider">{item.name}</td>
                  <td className="py-2.5 border-b border-divider">{item.totalPledged}</td>
                  <td className="py-2.5 border-b border-divider">
                    <Tag tone={item.tierLabel === "Base price" ? "neutral" : "accent"}>{item.tierLabel}</Tag>
                  </td>
                  <td className="py-2.5 border-b border-divider">{fmtR(item.currentPrice)}/unit</td>
                  <td className="py-2.5 border-b border-divider">
                    {fmtR(item.totalPledged * (item.basePrice - item.currentPrice))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h5 className="text-sm font-semibold mb-3">By buyer</h5>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr>
                {["Business", "Type", "Units", "Spend", "Saved"].map((h) => (
                  <th key={h} className="text-left py-2.5 text-[11px] uppercase tracking-wide text-faint border-b border-border">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats?.perBuyer.map((b) => (
                <tr key={b.id}>
                  <td className="py-2.5 border-b border-divider">{b.name}</td>
                  <td className="py-2.5 border-b border-divider text-muted">{b.type}</td>
                  <td className="py-2.5 border-b border-divider">{b.units}</td>
                  <td className="py-2.5 border-b border-divider">{fmtR(b.spend)}</td>
                  <td className="py-2.5 border-b border-divider">{fmtR(b.savings)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
