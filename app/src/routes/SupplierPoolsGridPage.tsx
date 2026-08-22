import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { useAllPools } from "../hooks/usePools";
import { useSupplierLinks, useRequestJoinPool, useRespondToLink } from "../hooks/useSupplierLinks";
import { Card, PageKicker, PrimaryButton, GhostButton, Tag, EmptyNote } from "../components/ui";

export default function SupplierPoolsGridPage() {
  const { supplierProfile } = useAuth();
  const navigate = useNavigate();
  const { data: pools } = useAllPools();
  const { data: links } = useSupplierLinks(supplierProfile?.id);
  const requestJoin = useRequestJoinPool();
  const respond = useRespondToLink();

  if (!supplierProfile) return null;

  const linkByPool = new Map((links ?? []).map((l) => [l.pool_id, l]));
  const myPools = (pools ?? []).filter((p) => linkByPool.get(p.id)?.status === "active");
  const otherPools = (pools ?? []).filter((p) => linkByPool.get(p.id)?.status !== "active");

  return (
    <div className="max-w-[1280px] mx-auto px-6 pt-8 pb-14 w-full">
      <div className="mb-6">
        <PageKicker>Supplier portal</PageKicker>
        <h2 className="text-[26px] font-bold m-0 tracking-tight">Area pools</h2>
        <p className="text-muted mt-1 mb-0 text-[13px]">{supplierProfile.company_name}</p>
      </div>

      <h4 className="text-base font-semibold mb-3">My pools</h4>
      {myPools.length === 0 ? (
        <EmptyNote>You're not linked to any pools yet — request to join one below.</EmptyNote>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-9">
          {myPools.map((p) => (
            <Card key={p.id} onClick={() => navigate(`/supplier/pools/${p.id}`)} className="flex flex-col gap-2.5">
              <div className="flex justify-between items-start gap-2">
                <div className="text-base font-semibold">{p.name}</div>
                <ChevronRight size={16} className="text-faint flex-shrink-0 mt-0.5" />
              </div>
              <div className="text-muted text-[13px]">
                {p.buyerCount} buyer{p.buyerCount === 1 ? "" : "s"}
              </div>
              <Tag>Active</Tag>
            </Card>
          ))}
        </div>
      )}

      <h4 className="text-base font-semibold mb-3 mt-8">Other pools</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {otherPools.map((p) => {
          const link = linkByPool.get(p.id);
          return (
            <Card key={p.id} className="flex flex-col gap-2.5">
              <div className="text-base font-semibold">{p.name}</div>
              <div className="text-muted text-[13px]">
                {p.buyerCount} buyer{p.buyerCount === 1 ? "" : "s"}
              </div>
              {!link && (
                <PrimaryButton
                  className="self-start"
                  onClick={() => requestJoin.mutate({ poolId: p.id, supplierId: supplierProfile.id })}
                >
                  Request to join
                </PrimaryButton>
              )}
              {link?.status === "pending" && link.initiated_by === "supplier" && (
                <Tag tone="neutral">Requested — awaiting admin</Tag>
              )}
              {link?.status === "pending" && link.initiated_by === "pool_admin" && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag tone="neutral">Invited by pool</Tag>
                  <GhostButton
                    onClick={() => respond.mutate({ linkId: link.id, poolId: p.id, supplierId: supplierProfile.id, accept: true })}
                  >
                    Accept
                  </GhostButton>
                  <GhostButton
                    onClick={() => respond.mutate({ linkId: link.id, poolId: p.id, supplierId: supplierProfile.id, accept: false })}
                  >
                    Decline
                  </GhostButton>
                </div>
              )}
              {link?.status === "declined" && <Tag tone="neutral">Declined</Tag>}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
