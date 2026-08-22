import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Sparkles, Package, CreditCard, PiggyBank, CheckCircle2 } from "lucide-react";
import { usePool } from "../hooks/usePools";
import { useOrderSummary } from "../hooks/useOrderSummary";
import { useAuth } from "../lib/AuthContext";
import { useOrder, useStartOrder, useAdvanceOrderStatus, useSimulatePayment, ORDER_STATUS_SEQUENCE, type OrderStatus } from "../hooks/useOrders";
import { generateOrderNarrative, AiError } from "../lib/ai";
import { fmtR } from "../lib/domain";
import { StatCard, Tag, PrimaryButton, GhostButton } from "../components/ui";

const STATUS_LABEL: Record<OrderStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  group_forming: "Group forming",
  confirmed: "Confirmed",
  processing: "Processing",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function OrderSummaryDetailPage() {
  const { poolId, supplierId } = useParams<{ poolId: string; supplierId: string }>();
  const { buyerProfile, supplierProfile } = useAuth();
  const { data: pool } = usePool(poolId);
  const { data: stats, isLoading } = useOrderSummary(poolId, supplierId);
  const { data: order } = useOrder(poolId, supplierId);
  const startOrder = useStartOrder();
  const advance = useAdvanceOrderStatus();
  const simulatePayment = useSimulatePayment();

  const isPoolAdmin = !!buyerProfile && pool?.admin_buyer_id === buyerProfile.id;
  const isThisSupplier = !!supplierProfile && supplierProfile.id === supplierId;
  const canManageOrder = isPoolAdmin || isThisSupplier;
  const currentUserId = buyerProfile?.id ?? supplierProfile?.id;

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

      <div className="bg-surface border border-border rounded-2xl p-5 sm:p-9">
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7">
          <StatCard dark icon={<Package size={13} />} label="Total units" value={String(stats?.totalUnits ?? 0)} />
          <StatCard dark icon={<CreditCard size={13} />} label="Total spend" value={fmtR(stats?.totalSpend ?? 0)} />
          <StatCard dark icon={<PiggyBank size={13} />} label="Total saved vs base" value={fmtR(stats?.totalSavings ?? 0)} />
        </div>

        <div className="bg-input border border-border rounded-xl p-4 sm:p-5 mb-7">
          {!order ? (
            <div className="flex justify-between items-center gap-3 flex-wrap">
              <div>
                <div className="text-sm font-semibold mb-0.5">No formal order yet</div>
                <p className="m-0 text-muted text-[12.5px]">
                  The numbers above are live and will keep changing as buyers adjust pledges. Start an order to lock
                  in a snapshot and track it through fulfilment.
                </p>
              </div>
              {canManageOrder && poolId && supplierId && currentUserId && (
                <PrimaryButton
                  onClick={() =>
                    startOrder.mutate({
                      poolId,
                      supplierId,
                      createdBy: currentUserId,
                      totalUnits: stats?.totalUnits ?? 0,
                      totalSpend: stats?.totalSpend ?? 0,
                      totalSavings: stats?.totalSavings ?? 0,
                    })
                  }
                  disabled={startOrder.isPending}
                  className="whitespace-nowrap"
                >
                  {startOrder.isPending ? "Starting…" : "Start order"}
                </PrimaryButton>
              )}
            </div>
          ) : (
            <>
              <div className="flex justify-between items-start gap-3 flex-wrap mb-3.5">
                <div>
                  <div className="text-[11px] text-faint uppercase tracking-wide mb-1">Order status</div>
                  <Tag tone={order.status === "cancelled" ? "neutral" : "accent"}>{STATUS_LABEL[order.status]}</Tag>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-faint uppercase tracking-wide mb-1">Snapshot at start</div>
                  <div className="text-[13px] text-text-soft">
                    {order.total_units} units · {fmtR(order.total_spend)} · {fmtR(order.total_savings)} saved
                  </div>
                </div>
              </div>

              {canManageOrder && order.status !== "completed" && order.status !== "cancelled" && (
                <div className="flex items-center gap-2 flex-wrap">
                  {(() => {
                    const idx = ORDER_STATUS_SEQUENCE.indexOf(order.status);
                    const next = idx >= 0 && idx < ORDER_STATUS_SEQUENCE.length - 1 ? ORDER_STATUS_SEQUENCE[idx + 1] : null;
                    return next && poolId && supplierId ? (
                      <PrimaryButton
                        onClick={() => advance.mutate({ orderId: order.id, status: next, poolId, supplierId })}
                        disabled={advance.isPending}
                      >
                        Advance to {STATUS_LABEL[next]}
                      </PrimaryButton>
                    ) : null;
                  })()}
                  {poolId && supplierId && (
                    <GhostButton
                      onClick={() => advance.mutate({ orderId: order.id, status: "cancelled", poolId, supplierId })}
                      disabled={advance.isPending}
                    >
                      Cancel order
                    </GhostButton>
                  )}
                </div>
              )}

              {(order.status === "confirmed" || order.status === "processing" || order.status === "completed") && (
                <div className="flex justify-between items-center gap-3 flex-wrap mt-3.5 pt-3.5 border-t border-border">
                  <div className="text-[13px]">
                    <div className="flex justify-between gap-4 text-text-soft mb-0.5">
                      <span>Order total</span>
                      <span>{fmtR(order.total_spend)}</span>
                    </div>
                    <div className="flex justify-between gap-4 text-faint text-[12px]">
                      <span>Transaction fee (2%)</span>
                      <span>{fmtR(order.transaction_fee)}</span>
                    </div>
                  </div>
                  {order.payment_status === "simulated_paid" ? (
                    <Tag>
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 size={12} /> Paid (simulated)
                      </span>
                    </Tag>
                  ) : canManageOrder && poolId && supplierId ? (
                    <PrimaryButton
                      onClick={() => simulatePayment.mutate({ orderId: order.id, poolId, supplierId })}
                      disabled={simulatePayment.isPending}
                    >
                      Simulate payment
                    </PrimaryButton>
                  ) : (
                    <Tag tone="neutral">Payment pending</Tag>
                  )}
                </div>
              )}
            </>
          )}
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
