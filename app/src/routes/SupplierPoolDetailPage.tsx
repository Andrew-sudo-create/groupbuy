import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ChevronRight, MapPin, Package, Users, TrendingUp, FileText, Plus } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { usePool, usePoolMembers } from "../hooks/usePools";
import { useSupplierItemsInPool, useCreateItem, useUpdateTier } from "../hooks/useCatalog";
import { fmtR, type ItemVM } from "../lib/domain";
import { CountdownChip } from "../components/Countdown";
import { Card, StatCard, ProgressBar, PrimaryButton, TextField, Label, Modal, ModalHeader } from "../components/ui";

export default function SupplierPoolDetailPage() {
  const { poolId } = useParams<{ poolId: string }>();
  const { supplierProfile } = useAuth();
  const navigate = useNavigate();
  const { data: pool } = usePool(poolId);
  const { data: members } = usePoolMembers(poolId);
  const { data: items } = useSupplierItemsInPool(supplierProfile?.id, poolId);
  const updateTier = useUpdateTier();

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);

  if (!supplierProfile || !poolId) return null;

  const selectedItem = items?.find((i) => i.id === selectedItemId) ?? null;
  const totalVolume = items?.reduce((s, i) => s + i.totalPledged, 0) ?? 0;
  const unlockedCount = items?.filter((i) => i.achievedIdx >= 0).length ?? 0;

  return (
    <div className="max-w-[1280px] mx-auto px-6 pt-8 pb-14 w-full">
      <Link to="/supplier" className="inline-flex items-center gap-1.5 text-muted text-[13.5px] mb-4">
        <ArrowLeft size={14} /> All pools
      </Link>
      <div className="flex justify-between items-start flex-wrap gap-3.5 mb-2">
        <h2 className="text-[26px] font-bold m-0 tracking-tight">{pool?.name ?? "…"} pool</h2>
        <CountdownChip closeAt={pool?.window_close_at} />
      </div>
      <p className="flex items-center gap-1.5 text-muted text-[13px] mb-6">
        <MapPin size={13} />
        {pool?.delivery_location || "Delivery location TBD"}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7">
        <StatCard icon={<Package size={13} />} label="Total volume pledged" value={`${totalVolume} units`} />
        <StatCard icon={<Users size={13} />} label="Buyers in this pool" value={String(members?.length ?? 0)} />
        <StatCard icon={<TrendingUp size={13} />} label="Items unlocked" value={`${unlockedCount}/${items?.length ?? 0}`} />
      </div>

      <div className="flex justify-between items-baseline mb-1">
        <h4 className="text-[17px] font-semibold m-0">Items</h4>
      </div>
      <p className="text-muted text-[13px] mb-3.5">Click an item to view or edit its tier pricing.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-7">
        {items?.map((item) => (
          <Card key={item.id} onClick={() => setSelectedItemId(item.id)} className="flex flex-col gap-2">
            <div className="flex justify-between items-start gap-2">
              <div className="text-[14.5px] font-semibold leading-tight">{item.name}</div>
              <ChevronRight size={15} className="text-faint flex-shrink-0 mt-0.5" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-base text-accent-light">{fmtR(item.currentPrice)}</span>
              <span className="text-faint text-[11.5px]">/{item.unit}</span>
            </div>
            <ProgressBar pct={item.fillPct} />
            <div className="text-[11.5px] text-muted">
              {item.totalPledged} units — {item.achievedIdx < 0 ? "base price" : `Tier ${item.achievedIdx + 1} reached`}
            </div>
          </Card>
        ))}
        <div
          onClick={() => setShowAddItem(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setShowAddItem(true);
            }
          }}
          className="border border-dashed border-border-strong rounded-[14px] p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer text-muted hover:text-text hover:border-border-hover transition-colors min-h-[120px]"
        >
          <Plus size={20} />
          <span className="text-[13px] font-medium">Add item</span>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-5 flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h5 className="m-0 mb-1 text-[15px] font-semibold">Generate order summary</h5>
          <p className="m-0 text-muted text-[13.5px]">
            Compiles every buyer's pledge in this pool into one draft purchase order with tier pricing and totals
            applied.
          </p>
        </div>
        <PrimaryButton
          onClick={() => navigate(`/summary/${poolId}/${supplierProfile.id}`)}
          className="inline-flex items-center gap-2 whitespace-nowrap"
        >
          <FileText size={16} />
          Generate order summary
        </PrimaryButton>
      </div>

      {selectedItem && (
        <TierEditorModal
          item={selectedItem}
          onClose={() => setSelectedItemId(null)}
          onChange={(tierId, field, value) => updateTier.mutate({ tierId, field, value, supplierId: supplierProfile.id })}
        />
      )}
      {showAddItem && <AddItemModal supplierId={supplierProfile.id} onClose={() => setShowAddItem(false)} />}
    </div>
  );
}

function TierEditorModal({
  item,
  onClose,
  onChange,
}: {
  item: ItemVM;
  onClose: () => void;
  onChange: (tierId: string, field: "threshold" | "price", value: number) => void;
}) {
  return (
    <Modal onClose={onClose}>
      <ModalHeader kicker={`${item.unit} · tier pricing`} title={item.name} onClose={onClose} />
      <p className="text-muted text-[13px] mt-2.5 mb-4.5">
        Base price {fmtR(item.basePrice)}/unit. Set the volume threshold and unit price for each tier.
      </p>
      <div className="flex flex-col gap-3">
        {item.tiers.map((tier) => (
          <div key={tier.id} className="flex items-center gap-2.5">
            <div className="w-14 text-[13px] font-semibold text-text-soft">Tier {tier.tier_index}</div>
            <div className="flex-1">
              <div className="text-[10.5px] text-faint mb-0.5">Units</div>
              <input
                type="number"
                defaultValue={tier.threshold}
                onBlur={(e) => onChange(tier.id, "threshold", Number(e.target.value))}
                className="w-full bg-input border border-border rounded-[7px] px-2.5 py-2 text-text text-[13.5px] font-sans"
              />
            </div>
            <div className="flex-1">
              <div className="text-[10.5px] text-faint mb-0.5">Price/unit</div>
              <input
                type="number"
                defaultValue={tier.price}
                onBlur={(e) => onChange(tier.id, "price", Number(e.target.value))}
                className="w-full bg-input border border-border rounded-[7px] px-2.5 py-2 text-text text-[13.5px] font-sans"
              />
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function AddItemModal({ supplierId, onClose }: { supplierId: string; onClose: () => void }) {
  const createItem = useCreateItem();
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [tiers, setTiers] = useState([
    { threshold: "", price: "" },
    { threshold: "", price: "" },
    { threshold: "", price: "" },
  ]);

  const disabled =
    !name.trim() ||
    !unit.trim() ||
    !basePrice ||
    tiers.some((t) => !t.threshold || !t.price) ||
    createItem.isPending;

  async function submit() {
    if (disabled) return;
    await createItem.mutateAsync({
      supplierId,
      name: name.trim(),
      unit: unit.trim(),
      basePrice: Number(basePrice),
      tiers: tiers.map((t) => ({ threshold: Number(t.threshold), price: Number(t.price) })),
    });
    onClose();
  }

  return (
    <Modal onClose={onClose}>
      <ModalHeader kicker="New catalog item" title="Add item" onClose={onClose} />
      <div className="flex flex-col gap-3.5 mt-4">
        <div>
          <Label>Item name</Label>
          <TextField placeholder="e.g. Ethiopia Yirgacheffe coffee beans" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Unit</Label>
            <TextField placeholder="e.g. 1kg bag" value={unit} onChange={(e) => setUnit(e.target.value)} />
          </div>
          <div>
            <Label>Base price</Label>
            <TextField type="number" placeholder="285" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
          </div>
        </div>
        <Label>Tiers</Label>
        {tiers.map((t, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className="w-14 text-[13px] font-semibold text-text-soft">Tier {i + 1}</div>
            <input
              type="number"
              placeholder="Units"
              value={t.threshold}
              onChange={(e) =>
                setTiers((rows) => rows.map((r, j) => (j === i ? { ...r, threshold: e.target.value } : r)))
              }
              className="flex-1 bg-input border border-border rounded-[7px] px-2.5 py-2 text-text text-[13.5px] font-sans"
            />
            <input
              type="number"
              placeholder="Price/unit"
              value={t.price}
              onChange={(e) => setTiers((rows) => rows.map((r, j) => (j === i ? { ...r, price: e.target.value } : r)))}
              className="flex-1 bg-input border border-border rounded-[7px] px-2.5 py-2 text-text text-[13.5px] font-sans"
            />
          </div>
        ))}
        <PrimaryButton disabled={disabled} onClick={submit} className="self-start mt-1.5">
          {createItem.isPending ? "Adding…" : "Add item"}
        </PrimaryButton>
      </div>
    </Modal>
  );
}
