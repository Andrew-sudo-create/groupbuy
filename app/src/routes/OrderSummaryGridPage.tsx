import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { useAllPools } from "../hooks/usePools";
import { useSupplierLinks } from "../hooks/useSupplierLinks";
import { useActiveSuppliersForPool } from "../hooks/useOrderSummary";
import { Card, PageKicker, EmptyNote } from "../components/ui";

export default function OrderSummaryGridPage() {
  const { role, buyerProfile, supplierProfile } = useAuth();

  if (role === "supplier" && supplierProfile) {
    return <SupplierSummaryGrid supplierId={supplierProfile.id} />;
  }
  if (role === "buyer" && buyerProfile) {
    return <BuyerSummaryGrid poolId={buyerProfile.pool_id} />;
  }
  return null;
}

function SupplierSummaryGrid({ supplierId }: { supplierId: string }) {
  const navigate = useNavigate();
  const { data: pools } = useAllPools();
  const { data: links } = useSupplierLinks(supplierId);
  const activePoolIds = new Set((links ?? []).filter((l) => l.status === "active").map((l) => l.pool_id));
  const myPools = (pools ?? []).filter((p) => activePoolIds.has(p.id));

  return (
    <div className="max-w-[1280px] mx-auto px-6 pt-8 pb-14 w-full">
      <PageKicker>Order summary</PageKicker>
      <h2 className="text-[26px] font-bold m-0 mb-6 tracking-tight">Choose a pool</h2>
      {myPools.length === 0 ? (
        <EmptyNote>You're not linked to any pools yet.</EmptyNote>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {myPools.map((p) => (
            <Card key={p.id} onClick={() => navigate(`/summary/${p.id}/${supplierId}`)} className="flex flex-col gap-2.5">
              <div className="flex justify-between items-start gap-2">
                <div className="text-base font-semibold">{p.name}</div>
                <ChevronRight size={16} className="text-faint flex-shrink-0 mt-0.5" />
              </div>
              <div className="text-muted text-[13px]">
                {p.buyerCount} buyer{p.buyerCount === 1 ? "" : "s"}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function BuyerSummaryGrid({ poolId }: { poolId: string | null }) {
  const navigate = useNavigate();
  const { data: suppliers } = useActiveSuppliersForPool(poolId);

  return (
    <div className="max-w-[1280px] mx-auto px-6 pt-8 pb-14 w-full">
      <PageKicker>Order summary</PageKicker>
      <h2 className="text-[26px] font-bold m-0 mb-6 tracking-tight">Choose a supplier</h2>
      {!suppliers || suppliers.length === 0 ? (
        <EmptyNote>No suppliers are active in your pool yet.</EmptyNote>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((s) => (
            <Card key={s.id} onClick={() => navigate(`/summary/${poolId}/${s.id}`)} className="flex flex-col gap-2.5">
              <div className="flex justify-between items-start gap-2">
                <div className="text-base font-semibold">{s.companyName}</div>
                <ChevronRight size={16} className="text-faint flex-shrink-0 mt-0.5" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
