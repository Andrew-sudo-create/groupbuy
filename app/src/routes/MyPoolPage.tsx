import { useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { usePool, usePoolMembers, useUpdatePoolDeliveryLocation } from "../hooks/usePools";
import { usePoolLinks, useAllSuppliers, useInviteSupplier, useRespondToLink } from "../hooks/useSupplierLinks";
import { Tag, TextField, Label, PageKicker, PrimaryButton, GhostButton, EmptyNote } from "../components/ui";

export default function MyPoolPage() {
  const { buyerProfile } = useAuth();
  const poolId = buyerProfile?.pool_id ?? null;
  const { data: pool } = usePool(poolId);
  const { data: members } = usePoolMembers(poolId);
  const { data: links } = usePoolLinks(poolId);
  const { data: allSuppliers } = useAllSuppliers();
  const updateDelivery = useUpdatePoolDeliveryLocation(poolId ?? "");
  const inviteSupplier = useInviteSupplier();
  const respond = useRespondToLink();

  const [delivery, setDelivery] = useState(pool?.delivery_location ?? "");
  const [inviteId, setInviteId] = useState("");

  const isAdmin = pool?.admin_buyer_id === buyerProfile?.id;
  const adminName = members?.find((m) => m.id === pool?.admin_buyer_id)?.business_name ?? "the pool admin";

  const linkedSupplierIds = new Set((links ?? []).map((l) => l.supplier_id));
  const invitableSuppliers = (allSuppliers ?? []).filter((s) => !linkedSupplierIds.has(s.id));

  if (!buyerProfile) return null;

  return (
    <div className="max-w-[900px] mx-auto px-6 pt-8 pb-14 w-full">
      <PageKicker>My pool</PageKicker>
      <h2 className="text-[26px] font-bold m-0 mb-6 tracking-tight">{pool?.name ?? "…"}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start mb-4">
        <div className="bg-surface border border-border rounded-2xl p-5">
          <h5 className="m-0 mb-3.5 text-[15px] font-semibold">Members</h5>
          <div className="flex flex-col gap-2.5">
            {members?.map((m) => (
              <div key={m.id} className="flex justify-between items-center gap-2.5 border-b border-divider pb-2.5">
                <div>
                  <div className="text-[13.5px]">{m.business_name}</div>
                  <div className="text-faint text-xs">{m.business_type}</div>
                </div>
                <div className="flex gap-1.5">
                  {m.id === buyerProfile.id && <Tag tone="neutral">You</Tag>}
                  {m.id === pool?.admin_buyer_id && <Tag>Admin</Tag>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-5">
          <h5 className="m-0 mb-1 text-[15px] font-semibold">Admin settings</h5>
          <p className="m-0 mb-4 text-faint text-[12.5px]">Managed by {adminName}</p>
          <Label>Delivery location</Label>
          <TextField
            value={delivery || pool?.delivery_location || ""}
            onChange={(e) => setDelivery(e.target.value)}
            onBlur={() => isAdmin && delivery !== pool?.delivery_location && updateDelivery.mutate(delivery)}
            disabled={!isAdmin}
          />
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-5">
        <h5 className="m-0 mb-3.5 text-[15px] font-semibold">Suppliers</h5>
        <div className="flex flex-col gap-2.5 mb-4">
          {links?.length ? (
            links.map((l) => (
              <div key={l.id} className="flex justify-between items-center gap-2.5 border-b border-divider pb-2.5">
                <div>
                  <div className="text-[13.5px]">{l.company_name}</div>
                  <div className="text-faint text-xs">
                    {l.status === "active" ? "Active" : l.status === "declined" ? "Declined" : "Pending"} ·{" "}
                    {l.initiated_by === "supplier" ? "requested to join" : "invited by pool"}
                  </div>
                </div>
                {l.status === "pending" && l.initiated_by === "supplier" && isAdmin && (
                  <div className="flex gap-1.5">
                    <GhostButton onClick={() => respond.mutate({ linkId: l.id, poolId: poolId!, supplierId: l.supplier_id, accept: true })}>
                      Accept
                    </GhostButton>
                    <GhostButton onClick={() => respond.mutate({ linkId: l.id, poolId: poolId!, supplierId: l.supplier_id, accept: false })}>
                      Decline
                    </GhostButton>
                  </div>
                )}
                {l.status === "active" && <Tag>Active</Tag>}
              </div>
            ))
          ) : (
            <EmptyNote>No suppliers linked yet.</EmptyNote>
          )}
        </div>

        {isAdmin && (
          <div>
            <Label>Invite a supplier</Label>
            <div className="flex gap-2">
              <select
                value={inviteId}
                onChange={(e) => setInviteId(e.target.value)}
                className="flex-1 bg-input border border-border rounded-[9px] px-3 py-2.5 text-text text-sm font-sans"
              >
                <option value="">Choose a supplier…</option>
                {invitableSuppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.company_name}
                  </option>
                ))}
              </select>
              <PrimaryButton
                disabled={!inviteId}
                onClick={() => {
                  inviteSupplier.mutate({ poolId: poolId!, supplierId: inviteId });
                  setInviteId("");
                }}
              >
                Invite
              </PrimaryButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
