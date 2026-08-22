import { Sparkles, MapPin, AlertTriangle, ArrowRight } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { useBuyerOpportunities, useApproveBuyerOpportunity, useDismissBuyerOpportunity } from "../hooks/useOpportunities";
import { fmtR } from "../lib/domain";
import type { BuyerOpportunity } from "../lib/ai";
import { Card, Tag, PrimaryButton, GhostButton, PageKicker, EmptyNote, ErrorNote } from "../components/ui";

export default function BuyerOpportunitiesPage() {
  const { buyerProfile } = useAuth();
  const { data: opportunities, isLoading, isError, error } = useBuyerOpportunities(buyerProfile?.id);
  const approve = useApproveBuyerOpportunity(buyerProfile?.id ?? "", buyerProfile?.pool_id ?? null);
  const dismiss = useDismissBuyerOpportunity(buyerProfile?.id ?? "", buyerProfile?.pool_id ?? null);

  if (!buyerProfile) return null;

  return (
    <div className="max-w-[900px] mx-auto px-6 pt-8 pb-14 w-full">
      <div className="mb-6">
        <PageKicker>Buyer dashboard</PageKicker>
        <h2 className="text-[26px] font-bold m-0 tracking-tight flex items-center gap-2">
          <Sparkles size={22} className="text-accent-light" />
          GroupBuy Opportunities
        </h2>
        <p className="text-muted mt-1.5 mb-0 text-[13.5px] max-w-[560px]">
          Other businesses whose active purchase requests match yours by product and location. Numbers are computed
          directly from real requests — the AI only explains them.
        </p>
      </div>

      {isLoading && <p className="text-faint text-sm">Matching your requests against other businesses…</p>}
      {isError && <ErrorNote>{error instanceof Error ? error.message : "Couldn't load opportunities right now."}</ErrorNote>}

      {opportunities && opportunities.length === 0 && (
        <EmptyNote>
          No matches yet — post a purchase request (or wait for more businesses to post compatible ones) to see
          opportunities here.
        </EmptyNote>
      )}

      <div className="flex flex-col gap-4">
        {opportunities?.map((opp, i) => (
          <OpportunityCard
            key={opp.requestId}
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
  opp: BuyerOpportunity;
  isTopPick: boolean;
  onApprove: () => void;
  onDismiss: () => void;
  busy: boolean;
}) {
  const canApprove = opp.matchedItem != null && (opp.canJoinDirectly || opp.isPoolAdmin);

  return (
    <Card className="flex flex-col gap-3.5">
      <div className="flex justify-between items-start gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <div className="text-base font-semibold">{opp.productName}</div>
            {isTopPick && <Tag>Best pick</Tag>}
          </div>
          <div className="text-muted text-[13px]">
            You want {opp.myQuantity} {opp.unit} — matched group totals {opp.combinedQuantity} {opp.unit}
          </div>
        </div>
        {opp.matchedItem && (
          <div className="text-right flex-shrink-0">
            <div className="flex items-center gap-1.5 text-[13px] text-faint">
              <span className="line-through">{opp.matchedItem.individualPrice}</span>
              <ArrowRight size={12} />
              <span className="font-bold text-accent-light text-[15px]">{opp.matchedItem.groupPrice}</span>
            </div>
            <div className="text-[13px] font-semibold text-accent-light mt-0.5">You save {fmtR(opp.savingsPerMe)}</div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {opp.matchedBuyers.map((b) => (
          <div
            key={b.buyerId}
            className="inline-flex items-center gap-1.5 bg-surface-2 rounded-full px-3 py-1.5 text-[12px] text-text-soft"
          >
            <span className="font-medium">{b.businessName}</span>
            <span className="text-faint">({b.businessType})</span>
            <span className="text-faint">
              · {b.quantity} {opp.unit}
            </span>
            {b.distanceKm != null && (
              <span className="flex items-center gap-0.5 text-faint">
                <MapPin size={10} />
                {b.distanceKm}km
              </span>
            )}
          </div>
        ))}
      </div>

      <p className="m-0 text-[13.5px] leading-relaxed text-text-soft">{opp.explanation}</p>

      {opp.matchedItem && (
        <p className="m-0 text-[12px] text-faint">
          Matched supplier: <span className="text-text-soft font-medium">{opp.matchedItem.supplierName}</span> ·{" "}
          {opp.matchedItem.tierLabel}
        </p>
      )}

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

      <div className="flex items-center gap-2.5 border-t border-border pt-3.5 flex-wrap">
        {!opp.matchedItem ? (
          <Tag tone="neutral">No supplier for this yet — informational only</Tag>
        ) : opp.canJoinDirectly ? (
          <PrimaryButton onClick={onApprove} disabled={busy}>
            Join at {opp.matchedItem.groupPrice}/unit
          </PrimaryButton>
        ) : opp.isPoolAdmin ? (
          <PrimaryButton onClick={onApprove} disabled={busy}>
            Invite {opp.matchedItem.supplierName} to my pool
          </PrimaryButton>
        ) : (
          <Tag tone="neutral">Ask your pool admin to invite {opp.matchedItem.supplierName} first</Tag>
        )}
        <GhostButton onClick={onDismiss} disabled={busy}>
          Dismiss
        </GhostButton>
      </div>
      {!canApprove && opp.matchedItem && !opp.canJoinDirectly && !opp.isPoolAdmin && (
        <p className="m-0 text-[11.5px] text-faint">
          You don't have permission to invite suppliers to your pool — only the pool admin can.
        </p>
      )}
    </Card>
  );
}
