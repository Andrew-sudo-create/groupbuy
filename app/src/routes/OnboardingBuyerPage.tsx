import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Plus } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { useAllPools } from "../hooks/usePools";
import { useCreateBuyerProfile } from "../hooks/useOnboarding";
import { PrimaryButton, TextField, Label, PageKicker, ErrorNote } from "../components/ui";
import type { Enums } from "../lib/database.types";

const BUSINESS_TYPES: Enums<"business_type">[] = ["Café", "Bakery", "Restaurant"];

export default function OnboardingBuyerPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: pools, isLoading } = useAllPools();
  const createProfile = useCreateBuyerProfile();

  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState<Enums<"business_type">>("Café");
  const [poolChoice, setPoolChoice] = useState<string | null>(null);
  const [newPoolName, setNewPoolName] = useState("");

  const disabled =
    !businessName.trim() ||
    !poolChoice ||
    (poolChoice === "__new__" && !newPoolName.trim()) ||
    createProfile.isPending;

  async function submit() {
    if (!user || disabled || !poolChoice) return;
    await createProfile.mutateAsync({
      userId: user.id,
      businessName: businessName.trim(),
      businessType,
      poolChoice,
      newPoolName,
    });
    navigate("/buyer", { replace: true });
  }

  return (
    <div className="max-w-[1040px] mx-auto px-6 py-16 w-full">
      <PageKicker>Buyer sign-up · step 2 of 2</PageKicker>
      <h1 className="text-[30px] font-bold tracking-tight mb-7">Tell us about your business</h1>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.15fr] gap-10 items-start">
        <div className="flex flex-col gap-4.5">
          <div>
            <Label>Business name</Label>
            <TextField
              placeholder="e.g. Little Owl Coffee"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
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
                    name="businessType"
                    className="hidden"
                    checked={businessType === bt}
                    onChange={() => setBusinessType(bt)}
                  />
                  {bt}
                </label>
              ))}
            </div>
          </div>
          {createProfile.isError && <ErrorNote>{(createProfile.error as Error).message}</ErrorNote>}
          <PrimaryButton disabled={disabled} onClick={submit} className="mt-2 self-start">
            {createProfile.isPending ? "Creating…" : "Create account & continue"}
          </PrimaryButton>
        </div>

        <div>
          <Label>Choose your pool</Label>
          <div className="flex flex-col gap-2.5">
            {isLoading && <p className="text-faint text-sm">Loading pools…</p>}
            {pools?.map((p) => {
              const selected = poolChoice === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setPoolChoice(p.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setPoolChoice(p.id);
                    }
                  }}
                  className={`bg-surface border rounded-xl px-4 py-3.5 cursor-pointer flex justify-between items-center gap-3 ${
                    selected ? "border-accent" : "border-border"
                  }`}
                >
                  <div>
                    <div className="text-sm font-semibold mb-0.5">{p.name}</div>
                    <div className="text-faint text-xs flex items-center gap-1">
                      <MapPin size={12} />
                      {p.delivery_location || "Delivery location TBD"}
                    </div>
                  </div>
                  <span className="text-muted text-xs whitespace-nowrap">
                    {p.buyerCount} buyer{p.buyerCount === 1 ? "" : "s"} already in
                  </span>
                </div>
              );
            })}
            <div
              onClick={() => setPoolChoice("__new__")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setPoolChoice("__new__");
                }
              }}
              className={`bg-surface border rounded-xl px-4 py-3.5 cursor-pointer ${
                poolChoice === "__new__" ? "border-accent" : "border-border"
              }`}
            >
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <Plus size={14} />
                Start a new pool
              </div>
              {poolChoice === "__new__" && (
                <TextField
                  placeholder="e.g. Sea Point Strip"
                  value={newPoolName}
                  onChange={(e) => setNewPoolName(e.target.value)}
                  className="mt-2.5 text-[13.5px]"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
