import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Plus } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { useAllPools, type PoolListItem } from "../hooks/usePools";
import { useCreateBuyerProfile } from "../hooks/useOnboarding";
import { distanceKm } from "../lib/domain";
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
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const myLat = lat.trim() ? Number(lat) : null;
  const myLng = lng.trim() ? Number(lng) : null;
  const hasLocation = myLat != null && myLng != null && !Number.isNaN(myLat) && !Number.isNaN(myLng);

  const sortedPools = useMemo(() => {
    const list = (pools ?? []).map((p) => ({
      ...p,
      distanceKm: hasLocation && p.lat != null && p.lng != null ? distanceKm(myLat!, myLng!, p.lat, p.lng) : null,
    }));
    if (!hasLocation) return list;
    return [...list].sort((a, b) => {
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });
  }, [pools, hasLocation, myLat, myLng]);

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
      lat: myLat,
      lng: myLng,
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
          <div>
            <Label>Your location (optional)</Label>
            <p className="m-0 mb-2 text-faint text-[11.5px] leading-relaxed">
              Sorts the pools on the right by distance. Find your coordinates by right-clicking your spot on Google
              Maps and copying the numbers shown.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <TextField
                type="number"
                step="any"
                placeholder="Latitude, e.g. -33.9249"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
              />
              <TextField
                type="number"
                step="any"
                placeholder="Longitude, e.g. 18.4241"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
              />
            </div>
          </div>
          {createProfile.isError && <ErrorNote>{(createProfile.error as Error).message}</ErrorNote>}
          <PrimaryButton disabled={disabled} onClick={submit} className="mt-2 self-start">
            {createProfile.isPending ? "Creating…" : "Create account & continue"}
          </PrimaryButton>
        </div>

        <div>
          <Label>Choose your pool{hasLocation ? " — nearest first" : ""}</Label>
          <div className="flex flex-col gap-2.5">
            {isLoading && <p className="text-faint text-sm">Loading pools…</p>}
            {sortedPools.map((p: PoolListItem & { distanceKm: number | null }, i) => {
              const selected = poolChoice === p.id;
              const nearest = hasLocation && i === 0 && p.distanceKm != null;
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
                    <div className="text-sm font-semibold mb-0.5 flex items-center gap-1.5">
                      {nearest && <span className="text-accent-light">★</span>}
                      {p.name}
                    </div>
                    <div className="text-faint text-xs flex items-center gap-1">
                      <MapPin size={12} />
                      {p.delivery_location || "Delivery location TBD"}
                    </div>
                  </div>
                  <span className="text-muted text-xs whitespace-nowrap text-right">
                    {p.distanceKm != null && <div>{p.distanceKm.toFixed(1)}km away</div>}
                    <div>
                      {p.buyerCount} buyer{p.buyerCount === 1 ? "" : "s"} already in
                    </div>
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
