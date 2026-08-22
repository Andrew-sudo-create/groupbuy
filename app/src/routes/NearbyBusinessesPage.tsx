import { Link } from "react-router-dom";
import { MapPin, Phone } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { useNearbyBusinesses } from "../hooks/useNearbyBusinesses";
import { Card, Tag, PageKicker, EmptyNote, ErrorNote } from "../components/ui";

export default function NearbyBusinessesPage() {
  const { buyerProfile } = useAuth();
  const hasLocation = buyerProfile?.lat != null && buyerProfile?.lng != null;
  const { data: businesses, isLoading, isError, error } = useNearbyBusinesses(buyerProfile?.id, buyerProfile?.lat, buyerProfile?.lng);

  if (!buyerProfile) return null;

  return (
    <div className="max-w-[800px] mx-auto px-6 pt-8 pb-14 w-full">
      <PageKicker>Buyer dashboard</PageKicker>
      <h2 className="text-[26px] font-bold m-0 mb-1.5 tracking-tight">Nearby Businesses</h2>
      <p className="text-muted mt-1 mb-6 text-[13px] max-w-[520px]">
        Every other business on GroupBuy B2B that's set a location, sorted by distance from you.
      </p>

      {!hasLocation && (
        <EmptyNote>
          Set your location on the{" "}
          <Link to="/account" className="text-accent-light underline">
            Account page
          </Link>{" "}
          to see nearby businesses.
        </EmptyNote>
      )}

      {hasLocation && isLoading && <p className="text-faint text-sm">Finding nearby businesses…</p>}
      {hasLocation && isError && (
        <ErrorNote>{error instanceof Error ? error.message : "Couldn't load nearby businesses right now."}</ErrorNote>
      )}
      {hasLocation && businesses && businesses.length === 0 && (
        <EmptyNote>No other businesses have set their location yet.</EmptyNote>
      )}

      <div className="flex flex-col gap-3">
        {businesses?.map((b) => (
          <Card key={b.id} className="flex justify-between items-center gap-3">
            <div>
              <div className="text-[15px] font-semibold">{b.businessName}</div>
              <div className="text-muted text-[13px] mt-0.5">
                {b.businessType} · {b.poolName}
              </div>
              {b.contactPhone && (
                <div className="flex items-center gap-1 text-faint text-[12px] mt-1.5">
                  <Phone size={11} />
                  {b.contactPhone}
                </div>
              )}
            </div>
            <Tag tone="neutral">
              <span className="inline-flex items-center gap-1">
                <MapPin size={11} />
                {b.distanceKm.toFixed(1)}km
              </span>
            </Tag>
          </Card>
        ))}
      </div>
    </div>
  );
}
