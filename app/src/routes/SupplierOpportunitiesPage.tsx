import { Sparkles, MapPin, Users, AlertTriangle, ArrowRight } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { useGroupOpportunities, useApproveOpportunity, useDismissOpportunity } from "../hooks/useOpportunities";
import { fmtR } from "../lib/domain";
import type { Opportunity } from "../lib/ai";
import { Card, Tag, PrimaryButton, GhostButton, PageKicker, EmptyNote, ErrorNote } from "../components/ui";

export default function SupplierOpportunitiesPage() {
  const { supplierProfile } = useAuth();
  const { data: opportunities, isLoading, isError, error } = useGroupOpportunities(supplierProfile?.id);
  const approve = useApproveOpportunity(supplierProfile?.id ?? "");
  const dismiss = useDismissOpportunity(supplierProfile?.id ?? "");

  if (!supplierProfile) return null;

  return (
    <div className="max-w-[900px] mx-auto px-6 pt-8 pb-14 w-full">
      <div className="mb-6">
        <PageKicker>Supplier portal</PageKicker>
        <h2 className="text-[26px] font-bold m-0 tracking-tight flex items-center gap-2">
          <Sparkles size={22} className="text-accent-light" />
          AI Opportunities
        </h2>
        <p className="text-muted mt-1.5 mb-0 text-[13.5px] max-w-[560px]">
          Combinations of pools whose real pledged demand, combined, would cross into a better pricing tier for one of
          your items. Numbers are computed directly from pledges — the AI only explains them.
        </p>
      </div>

      {isLoading && <p className="text-faint text-sm">Scanning your catalog against every pool's demand…</p>}
      {isError && <ErrorNote>{error instanceof Error ? error.message : "Couldn't load opportunities right now."}</ErrorNote>}

      {opportunities && opportunities.length === 0 && (
        <EmptyNote>
          No group opportunities right now — either every pool with demand for your items is already linked, or no
          unlinked pool has enough pledged volume yet to unlock a better tier.
        </EmptyNote>
      )}

      <div className="flex flex-col gap-4">
        {opportunities?.map((opp, i) => (
          <OpportunityCard
            key={`${opp.itemId}:${opp.pools.map((p) => p.poolId).join(",")}`}
            opp={opp}
            isTopPick={i === 0}
            onApprove={() => approve.mutate(opp)}
            onDismiss={() => dismiss.mutate(opp)}
            busy={approve.isPending || dismiss.isPending}
          />
        ))}
      </div>
    </div>
  );
}

function OpportunityCard({
  opp,
  isTopPick,
  onApprove,
  onDismiss,
  busy,
}: {
  opp: Opportunity;
  isTopPick: boolean;
  onApprove: () => void;
  onDismiss: () => void;
  busy: boolean;
}) {
  const allRequested = opp.pools.every((p) => p.linkStatus === "pending");

  return (
    <Card className="flex flex-col gap-3.5">
      <div className="flex justify-between items-start gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <div className="text-base font-semibold">{opp.itemName}</div>
            {isTopPick && <Tag>Best pick</Tag>}
          </div>
          <div className="text-muted text-[13px]">
            {opp.combinedQtyBefore} → {opp.combinedQtyAfter} {opp.unit} combined ({opp.currentTierLabel} → {opp.newTierLabel})
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="flex items-center gap-1.5 text-[13px] text-faint">
            <span className="line-through">{opp.priceBefore}</span>
            <ArrowRight size={12} />
            <span className="font-bold text-accent-light text-[15px]">{opp.priceAfter}</span>
          </div>
          <div className="text-[13px] font-semibold text-accent-light mt-0.5">Saves {fmtR(opp.savings)}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {opp.pools.map((p) => (
          <div
            key={p.poolId}
            className="inline-flex items-center gap-1.5 bg-surface-2 rounded-full px-3 py-1.5 text-[12px] text-text-soft"
          >
            <MapPin size={11} className="text-faint" />
            <span className="font-medium">{p.poolName}</span>
            <span className="text-faint">
              · {p.addedQty} {opp.unit}
            </span>
            <span className="flex items-center gap-0.5 text-faint">
              <Users size={10} />
              {p.buyerCount}
            </span>
            {p.buyerSpreadKm != null && <span className="text-faint">~{p.buyerSpreadKm.toFixed(1)}km apart</span>}
            {p.linkStatus === "pending" && <Tag tone="neutral">Requested</Tag>}
          </div>
        ))}
      </div>

      <p className="m-0 text-[13.5px] leading-relaxed text-text-soft">{opp.explanation}</p>

      {opp.riskFlags.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-border pt-3">
          {opp.riskFlags.map((flag, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[12.5px] text-error">
              <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
              <span>{flag}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2.5 border-t border-border pt-3.5">
        {allRequested ? (
          <Tag tone="neutral">Requested — awaiting pool responses</Tag>
        ) : (
          <PrimaryButton onClick={onApprove} disabled={busy}>
            Request these pools
          </PrimaryButton>
        )}
        <GhostButton onClick={onDismiss} disabled={busy}>
          Dismiss
        </GhostButton>
      </div>
    </Card>
  );
}
