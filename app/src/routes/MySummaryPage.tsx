import { Package, CreditCard, PiggyBank } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { usePool } from "../hooks/usePools";
import { usePoolCatalog } from "../hooks/useCatalog";
import { useMyPledges } from "../hooks/usePledges";
import { fmtR } from "../lib/domain";
import { StatCard, Tag, PageKicker, EmptyNote } from "../components/ui";

export default function MySummaryPage() {
  const { buyerProfile } = useAuth();
  const { data: pool } = usePool(buyerProfile?.pool_id);
  const { data: catalog } = usePoolCatalog(buyerProfile?.pool_id);
  const { data: pledgeRows } = useMyPledges(buyerProfile?.id);

  if (!buyerProfile) return null;

  const rows = (pledgeRows ?? [])
    .filter((p) => p.qty > 0)
    .map((p) => {
      const item = catalog?.find((i) => i.id === p.item_id);
      if (!item) return null;
      return { qty: p.qty, item };
    })
    .filter((r): r is { qty: number; item: NonNullable<typeof catalog>[number] } => r !== null);

  const units = rows.reduce((s, r) => s + r.qty, 0);
  const spend = rows.reduce((s, r) => s + r.qty * r.item.currentPrice, 0);
  const savings = rows.reduce((s, r) => s + r.qty * (r.item.basePrice - r.item.currentPrice), 0);

  return (
    <div className="max-w-[800px] mx-auto px-6 pt-8 pb-14 w-full">
      <PageKicker>My summary</PageKicker>
      <h2 className="text-[26px] font-bold m-0 mb-1.5 tracking-tight">{buyerProfile.business_name}</h2>
      <p className="text-muted text-[13.5px] m-0 mb-6">{pool?.name ?? "…"} pool · your own pledges only</p>

      <div className="grid grid-cols-3 gap-4 mb-7">
        <StatCard icon={<Package size={13} />} label="Units pledged" value={String(units)} />
        <StatCard icon={<CreditCard size={13} />} label="Total spend" value={fmtR(spend)} />
        <StatCard icon={<PiggyBank size={13} />} label="Total saved" value={fmtR(savings)} />
      </div>

      {rows.length > 0 ? (
        <div className="overflow-x-auto">
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
              {rows.map(({ qty, item }) => (
                <tr key={item.id}>
                  <td className="py-2.5 border-b border-divider">{item.name}</td>
                  <td className="py-2.5 border-b border-divider">{qty}</td>
                  <td className="py-2.5 border-b border-divider">
                    <Tag tone={item.tierLabel === "Base price" ? "neutral" : "accent"}>{item.tierLabel}</Tag>
                  </td>
                  <td className="py-2.5 border-b border-divider">{fmtR(item.currentPrice)}/unit</td>
                  <td className="py-2.5 border-b border-divider">{fmtR(qty * (item.basePrice - item.currentPrice))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyNote>Nothing pledged yet — head to the Buyer Dashboard to join an order.</EmptyNote>
      )}
    </div>
  );
}
