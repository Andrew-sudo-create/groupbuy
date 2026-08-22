import { useState } from "react";
import { Sparkles, ChevronRight, X } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { usePool } from "../hooks/usePools";
import { usePoolCatalog } from "../hooks/useCatalog";
import { useMyPledges, useJoinOrder, useRemovePledge } from "../hooks/usePledges";
import { useSettings } from "../hooks/useSettings";
import { suggestPledge, fetchDemandProfile, AiError, type PledgeSuggestion } from "../lib/ai";
import { fmtR, type ItemVM } from "../lib/domain";
import { CountdownChip } from "../components/Countdown";
import {
  Card,
  Tag,
  ProgressBar,
  PrimaryButton,
  GhostButton,
  IconButton,
  TextArea,
  TextField,
  Modal,
  ModalHeader,
  EmptyNote,
  ErrorNote,
} from "../components/ui";

export default function BuyerDashboardPage() {
  const { buyerProfile } = useAuth();
  const { data: pool } = usePool(buyerProfile?.pool_id);
  const { data: catalog, isLoading: catalogLoading } = usePoolCatalog(buyerProfile?.pool_id);
  const { data: pledgeRows } = useMyPledges(buyerProfile?.id);
  const { data: settings } = useSettings(buyerProfile?.id);
  const joinOrder = useJoinOrder();
  const removePledge = useRemovePledge();

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [qtyInputs, setQtyInputs] = useState<Record<string, string>>({});
  const [aiDesc, setAiDesc] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<PledgeSuggestion | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showDemand, setShowDemand] = useState(false);
  const [demandLoading, setDemandLoading] = useState(false);
  const [demandProfile, setDemandProfile] = useState<{ demandProfile: string; poolMatchReason: string } | null>(null);
  const [demandError, setDemandError] = useState<string | null>(null);

  if (!buyerProfile) return null;

  const myPledgeMap = new Map((pledgeRows ?? []).map((p) => [p.item_id, p.qty]));
  const selectedItem = catalog?.find((i) => i.id === selectedItemId) ?? null;

  async function handleAiSuggest() {
    if (!aiDesc.trim() || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    try {
      const result = await suggestPledge(aiDesc.trim());
      setAiResult(result);
    } catch (e) {
      setAiError(e instanceof AiError ? e.message : "Couldn't reach the AI suggestion service. Try again in a moment.");
    } finally {
      setAiLoading(false);
    }
  }

  function acceptAiSuggestion() {
    if (!aiResult) return;
    setQtyInputs((q) => ({ ...q, [aiResult.itemId]: String(aiResult.quantity) }));
    setSelectedItemId(aiResult.itemId);
  }

  async function handleViewDemandProfile() {
    setShowDemand(true);
    if (demandProfile || demandLoading) return;
    setDemandLoading(true);
    setDemandError(null);
    try {
      const result = await fetchDemandProfile();
      setDemandProfile(result);
    } catch (e) {
      setDemandError(e instanceof AiError ? e.message : "Couldn't read the demand profile right now. Try again in a moment.");
    } finally {
      setDemandLoading(false);
    }
  }

  async function joinFromModal(item: ItemVM) {
    const qty = parseInt(qtyInputs[item.id] ?? "", 10);
    if (isNaN(qty) || qty <= 0) return;
    await joinOrder.mutateAsync({ buyerId: buyerProfile!.id, poolId: buyerProfile!.pool_id!, itemId: item.id, qty });
    setSelectedItemId(null);
  }

  const myPledgeRows = (pledgeRows ?? [])
    .filter((p) => p.qty > 0)
    .map((p) => {
      const item = catalog?.find((i) => i.id === p.item_id);
      if (!item) return null;
      return { pledge: p, item };
    })
    .filter((r): r is { pledge: NonNullable<typeof pledgeRows>[number]; item: ItemVM } => r !== null);

  const totalSpend = myPledgeRows.reduce((s, r) => s + r.pledge.qty * r.item.currentPrice, 0);
  const totalSavings = myPledgeRows.reduce((s, r) => s + r.pledge.qty * (r.item.basePrice - r.item.currentPrice), 0);

  return (
    <div className="max-w-[1280px] mx-auto px-6 pt-8 pb-14 w-full">
      <div className="flex justify-between items-start flex-wrap gap-3.5 mb-6">
        <div>
          <div className="text-accent-light text-xs font-semibold tracking-wider uppercase mb-1.5">Buyer dashboard</div>
          <h2 className="text-[26px] font-bold m-0 mb-0.5 tracking-tight">{buyerProfile.business_name}</h2>
          <p className="text-muted m-0 text-sm">
            {buyerProfile.business_type} · {pool?.name ?? "…"} pool
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <CountdownChip closeAt={pool?.window_close_at} />
          <button
            onClick={handleViewDemandProfile}
            className="inline-flex items-center gap-1.5 whitespace-nowrap border border-border-strong rounded-full px-3.5 py-1.5 text-[13px] text-accent-light bg-transparent cursor-pointer hover:bg-surface-2 font-sans"
          >
            <Sparkles size={14} />
            View AI demand profile
          </button>
        </div>
      </div>

      {settings?.ai_suggestions !== false && (
        <div className="bg-surface border border-border rounded-2xl mb-6 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} className="text-accent-light" />
            <h5 className="m-0 text-[15px] font-semibold">Describe your business, let AI suggest a pledge</h5>
          </div>
          <div className="flex gap-3 items-start flex-wrap">
            <TextArea
              placeholder="e.g. Small specialty café, about 60 covers a day, we go through a lot of milk and pull espresso all day."
              value={aiDesc}
              onChange={(e) => setAiDesc(e.target.value)}
              className="flex-1 min-w-[260px] min-h-[60px]"
            />
            <PrimaryButton disabled={aiLoading || !aiDesc.trim()} onClick={handleAiSuggest} className="whitespace-nowrap">
              {aiLoading ? "Thinking…" : "Suggest a pledge"}
            </PrimaryButton>
          </div>
          {aiError && <ErrorNote>{aiError}</ErrorNote>}
          {aiResult && (
            <div className="mt-3.5 border-t border-border pt-3.5 flex justify-between items-center gap-3 flex-wrap">
              <p className="m-0 text-sm text-text-soft">
                <strong className="text-text">
                  {aiResult.quantity} × {aiResult.itemName}
                </strong>{" "}
                — {aiResult.rationale}
              </p>
              <GhostButton onClick={acceptAiSuggestion} className="whitespace-nowrap">
                Use this quantity
              </GhostButton>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 items-start">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {catalogLoading && <p className="text-faint text-sm col-span-2">Loading catalog…</p>}
          {catalog?.length === 0 && (
            <p className="text-faint text-sm col-span-2">
              No suppliers are active in your pool yet — invite one from My Pool.
            </p>
          )}
          {catalog?.map((item) => {
            const mine = myPledgeMap.get(item.id) ?? 0;
            const remaining = item.nextTier ? item.nextTier.threshold - item.totalPledged : 0;
            const caption = item.nextTier
              ? `${item.totalPledged} units ordered — ${remaining} to next tier`
              : `${item.totalPledged} units ordered — top tier reached`;
            return (
              <Card key={item.id} onClick={() => setSelectedItemId(item.id)} className="flex flex-col gap-2">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="text-[11px] text-faint uppercase tracking-wide mb-1">{item.unit}</div>
                    <div className="text-[15px] font-semibold leading-tight">{item.name}</div>
                  </div>
                  <ChevronRight size={16} className="text-faint flex-shrink-0 mt-0.5" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-[17px] text-accent-light">{fmtR(item.currentPrice)}</span>
                  <span className="text-faint text-xs">/unit</span>
                  {mine > 0 && (
                    <span className="ml-auto">
                      <Tag>{mine} pledged</Tag>
                    </span>
                  )}
                </div>
                <ProgressBar pct={item.fillPct} />
                <p className="m-0 text-xs text-muted">{caption}</p>
              </Card>
            );
          })}
        </div>

        <div className="bg-surface border border-border rounded-2xl lg:sticky lg:top-4 p-5">
          <h5 className="m-0 mb-3.5 text-[15px] font-semibold">My pledges</h5>
          {myPledgeRows.length > 0 ? (
            <>
              <div className="flex flex-col gap-3">
                {myPledgeRows.map(({ pledge, item }) => (
                  <div key={item.id} className="flex justify-between items-center gap-2.5 border-b border-border pb-3">
                    <div>
                      <div className="text-[13.5px]">{item.name}</div>
                      <div className="text-faint text-xs">
                        {pledge.qty} × {fmtR(item.currentPrice)} = {fmtR(pledge.qty * item.currentPrice)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        value={pledge.qty}
                        onChange={(e) => {
                          const qty = parseInt(e.target.value, 10);
                          joinOrder.mutate({
                            buyerId: buyerProfile.id,
                            poolId: buyerProfile.pool_id!,
                            itemId: item.id,
                            qty: isNaN(qty) ? 0 : qty,
                          });
                        }}
                        className="w-14 bg-input border border-border rounded-[7px] px-2 py-1.5 text-text text-[13px] font-sans"
                      />
                      <IconButton
                        aria-label="Remove"
                        onClick={() =>
                          removePledge.mutate({ buyerId: buyerProfile.id, itemId: item.id, poolId: buyerProfile.pool_id! })
                        }
                      >
                        <X size={14} />
                      </IconButton>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border my-3.5" />
              <div className="flex justify-between text-[13.5px]">
                <span className="text-muted">Total committed</span>
                <strong>{fmtR(totalSpend)}</strong>
              </div>
              <div className="flex justify-between text-[13.5px] text-accent-light mt-1.5">
                <span>Saved vs base price</span>
                <strong>{fmtR(totalSavings)}</strong>
              </div>
            </>
          ) : (
            <EmptyNote>Nothing pledged yet — open an order from the catalog to join in.</EmptyNote>
          )}
        </div>
      </div>

      {selectedItem && (
        <Modal onClose={() => setSelectedItemId(null)}>
          <ModalHeader kicker={`${selectedItem.unit} · order`} title={selectedItem.name} onClose={() => setSelectedItemId(null)} />
          <div className="flex items-baseline gap-2 my-3.5">
            <span className="line-through text-[13px] text-faint">{fmtR(selectedItem.basePrice)}</span>
            <span className="font-bold text-xl text-accent-light">{fmtR(selectedItem.currentPrice)}</span>
            <span className="text-faint text-xs">/unit</span>
          </div>
          <ProgressBar pct={selectedItem.fillPct} ticks={selectedItem.ticks} thick />
          <p className="mt-2 mb-5 text-[13px] text-muted">
            {selectedItem.nextTier
              ? `${selectedItem.totalPledged}/${selectedItem.nextTier.threshold} units — ${
                  selectedItem.nextTier.threshold - selectedItem.totalPledged
                } more unlocks ${fmtR(selectedItem.nextTier.price)}/unit`
              : `${selectedItem.totalPledged} units — top tier unlocked at ${fmtR(selectedItem.currentPrice)}/unit`}
          </p>
          <div className="flex gap-2 items-center">
            <TextField
              type="number"
              min={0}
              placeholder="Units"
              value={qtyInputs[selectedItem.id] ?? ""}
              onChange={(e) => setQtyInputs((q) => ({ ...q, [selectedItem.id]: e.target.value }))}
              className="w-[90px]"
            />
            <PrimaryButton onClick={() => joinFromModal(selectedItem)} className="flex-1">
              Join order
            </PrimaryButton>
          </div>
        </Modal>
      )}

      {showDemand && (
        <Modal onClose={() => setShowDemand(false)} maxWidth={480}>
          <ModalHeader kicker="AI demand profile" title={buyerProfile.business_name} onClose={() => setShowDemand(false)} />
          {demandLoading && <p className="text-muted italic text-sm my-4">Reading your order history…</p>}
          {demandError && <p className="text-error text-[13px] my-4">{demandError}</p>}
          {demandProfile && (
            <>
              <p className="text-[14.5px] leading-relaxed text-text-strong my-4">{demandProfile.demandProfile}</p>
              <div className="border-t border-border mb-3.5" />
              <div className="text-[11px] text-faint uppercase tracking-wide mb-2">Why this pool</div>
              <p className="text-sm leading-relaxed text-text-soft m-0">{demandProfile.poolMatchReason}</p>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
