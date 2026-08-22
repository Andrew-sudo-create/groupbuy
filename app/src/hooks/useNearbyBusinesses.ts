import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import { distanceKm } from "../lib/domain";

export interface NearbyBusiness {
  id: string;
  businessName: string;
  businessType: string;
  poolId: string | null;
  poolName: string;
  contactPhone: string;
  distanceKm: number;
}

/** Every other buyer with a location set, sorted by distance from the caller.
 * buyer_profiles is already world-readable (business_name/type/contact are
 * meant to be discoverable for exactly this kind of matchmaking) — this just
 * reads it and does the distance math client-side. */
export function useNearbyBusinesses(myId: string | null | undefined, myLat: number | null | undefined, myLng: number | null | undefined) {
  return useQuery({
    queryKey: ["nearbyBusinesses", myId, myLat, myLng],
    queryFn: async (): Promise<NearbyBusiness[]> => {
      const { data, error } = await supabase
        .from("buyer_profiles")
        .select("id, business_name, business_type, pool_id, contact_phone, lat, lng, pools(name)")
        .neq("id", myId!)
        .not("lat", "is", null)
        .not("lng", "is", null);
      if (error) throw error;
      return (data ?? [])
        .map((b) => ({
          id: b.id,
          businessName: b.business_name,
          businessType: b.business_type,
          poolId: b.pool_id,
          poolName: (b.pools as unknown as { name: string } | null)?.name ?? "No pool yet",
          contactPhone: b.contact_phone,
          distanceKm: distanceKm(myLat!, myLng!, b.lat!, b.lng!),
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 30);
    },
    enabled: !!myId && myLat != null && myLng != null,
  });
}
