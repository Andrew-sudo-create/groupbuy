import { useEffect, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { usePool } from "../hooks/usePools";
import { useUpdateBuyerAccount } from "../hooks/useAccount";
import type { Enums } from "../lib/database.types";
import { PrimaryButton, TextField, TextArea, Label, PageKicker } from "../components/ui";

const BUSINESS_TYPES: Enums<"business_type">[] = ["Café", "Bakery", "Restaurant"];

export default function AccountPage() {
  const { buyerProfile } = useAuth();
  const { data: pool } = usePool(buyerProfile?.pool_id);
  const update = useUpdateBuyerAccount();

  const [businessName, setBusinessName] = useState(buyerProfile?.business_name ?? "");
  const [businessType, setBusinessType] = useState<Enums<"business_type">>(buyerProfile?.business_type ?? "Café");
  const [orderNotes, setOrderNotes] = useState(buyerProfile?.order_notes ?? "");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!buyerProfile) return;
    setBusinessName(buyerProfile.business_name);
    setBusinessType(buyerProfile.business_type);
    setOrderNotes(buyerProfile.order_notes);
  }, [buyerProfile]);

  if (!buyerProfile) return null;

  async function save() {
    await update.mutateAsync({
      buyerId: buyerProfile!.id,
      businessName: businessName.trim(),
      businessType,
      orderNotes,
    });
    setSaved(true);
  }

  return (
    <div className="max-w-[560px] mx-auto px-6 pt-8 pb-14 w-full">
      <PageKicker>Account</PageKicker>
      <h2 className="text-[26px] font-bold m-0 mb-6 tracking-tight">Business profile</h2>
      <div className="flex flex-col gap-4">
        <div>
          <Label>Business name</Label>
          <TextField
            value={businessName}
            onChange={(e) => {
              setBusinessName(e.target.value);
              setSaved(false);
            }}
          />
        </div>
        <div>
          <Label>Business type</Label>
          <div className="inline-flex gap-1 bg-surface border border-border rounded-[10px] p-1">
            {BUSINESS_TYPES.map((bt) => (
              <label
                key={bt}
                className={`px-3.5 py-1.5 rounded-[7px] text-[13px] font-medium cursor-pointer ${
                  businessType === bt ? "bg-surface-2 text-text" : "text-muted"
                }`}
              >
                <input
                  type="radio"
                  name="accountBusinessType"
                  className="hidden"
                  checked={businessType === bt}
                  onChange={() => {
                    setBusinessType(bt);
                    setSaved(false);
                  }}
                />
                {bt}
              </label>
            ))}
          </div>
        </div>
        <div>
          <Label>Neighborhood / pool</Label>
          <TextField value={pool?.name ?? ""} disabled />
        </div>
        <div>
          <Label>Order & stock notes</Label>
          <TextArea
            placeholder="Jot down recent deliveries, reorder cadence, current stock — the AI demand profile on your dashboard reads this."
            value={orderNotes}
            onChange={(e) => {
              setOrderNotes(e.target.value);
              setSaved(false);
            }}
            className="min-h-[110px]"
          />
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          <PrimaryButton onClick={save} disabled={update.isPending}>
            {update.isPending ? "Saving…" : "Save changes"}
          </PrimaryButton>
          {saved && <span className="text-accent-light text-[13px]">Saved</span>}
        </div>
      </div>
    </div>
  );
}
